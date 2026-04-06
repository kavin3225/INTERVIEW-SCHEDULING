const express = require('express');
const { Op } = require('sequelize');
const { Booking, InterviewSlot, User } = require('../models');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(auth);
router.use(requireRole('admin', 'recruiter'));

function buildOverviewPayload(bookings, slots) {
  const scheduled = bookings.filter((b) => b.status === 'scheduled').length;
  const completed = bookings.filter((b) => b.status === 'completed').length;
  const cancelled = bookings.filter((b) => b.status === 'cancelled').length;
  return {
    totalSlots: slots.length,
    totalBookings: bookings.length,
    scheduled,
    completed,
    cancelled,
    bookings: bookings.map((b) => ({
      id: b.id,
      status: b.status,
      slotDate: b.InterviewSlot?.slotDate,
      startTime: b.InterviewSlot?.startTime,
      candidateName: 'Private Candidate',
      candidateEmail: null,
    })),
  };
}

async function fetchOverviewData(user, { from, to }) {
  const whereSlot = {};
  if (user.role === 'recruiter') whereSlot.recruiterId = user.id;
  if (from) whereSlot.slotDate = { ...whereSlot.slotDate, [Op.gte]: from };
  if (to) whereSlot.slotDate = { ...whereSlot.slotDate, [Op.lte]: to };
  const slots = await InterviewSlot.findAll({ where: whereSlot, attributes: ['id'] });
  const slotIds = slots.map((s) => s.id);
  const bookings = await Booking.findAll({
    where: { slotId: slotIds },
    include: [
      { model: InterviewSlot, attributes: ['slotDate', 'startTime'] },
      { model: User, as: 'Candidate', attributes: ['name', 'email'] },
    ],
  });
  return buildOverviewPayload(bookings, slots);
}

function escapePdfText(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function createPdfBuffer(title, lines) {
  const pageWidth = 595;
  const pageHeight = 842;
  const marginX = 50;
  const topY = 790;
  const lineHeight = 18;
  const bottomY = 60;
  const pages = [];
  let currentPage = [];
  let y = topY;

  lines.forEach((line) => {
    if (y < bottomY) {
      pages.push(currentPage);
      currentPage = [];
      y = topY;
    }
    currentPage.push({ text: line, y });
    y -= lineHeight;
  });
  if (currentPage.length) pages.push(currentPage);

  const objects = [];
  objects.push('<< /Type /Catalog /Pages 2 0 R >>');
  objects.push(`<< /Type /Pages /Count ${pages.length} /Kids [${pages.map((_, index) => `${3 + index * 2} 0 R`).join(' ')}] >>`);

  const fontObjectId = 3 + pages.length * 2;

  pages.forEach((pageLines, index) => {
    const pageObjectId = 3 + index * 2;
    const contentObjectId = pageObjectId + 1;
    const contentLines = [
      'BT',
      '/F1 22 Tf',
      `1 0 0 1 ${marginX} ${topY + 12} Tm`,
      `(${escapePdfText(title)}) Tj`,
      '/F1 11 Tf',
    ];

    pageLines.forEach((line) => {
      contentLines.push(`1 0 0 1 ${marginX} ${line.y} Tm`);
      contentLines.push(`(${escapePdfText(line.text)}) Tj`);
    });
    contentLines.push('ET');
    const stream = contentLines.join('\n');

    objects[pageObjectId - 1] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontObjectId} 0 R >> >> /Contents ${contentObjectId} 0 R >>`;
    objects[contentObjectId - 1] = `<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream`;
  });

  objects[fontObjectId - 1] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';

  let pdf = '%PDF-1.4\n';
  const offsets = [];
  objects.forEach((object, index) => {
    offsets[index + 1] = Buffer.byteLength(pdf, 'utf8');
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefStart = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf, 'utf8');
}

function escapeCsvValue(value) {
  const stringValue = String(value ?? '');
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function formatDateForCsv(value) {
  if (!value) return '-';
  return `="${String(value)}"`;
}

function formatTimeForCsv(value) {
  if (!value) return '-';
  return `="${String(value).slice(0, 5)}"`;
}

function createCsvBuffer(data, query) {
  const completionRate = data.totalBookings > 0
    ? Math.round((data.completed / data.totalBookings) * 100)
    : 0;
  const rows = [
    ['Interview Scheduling Overall Report'],
    ['Generated', new Date().toLocaleString('en-IN')],
    ['From', query.from || 'All'],
    ['To', query.to || 'All'],
    [],
    ['Metric', 'Value'],
    ['Total Slots', data.totalSlots],
    ['Total Bookings', data.totalBookings],
    ['Scheduled', data.scheduled],
    ['Completed', data.completed],
    ['Cancelled', data.cancelled],
    ['Completion Rate', `${completionRate}%`],
    [],
    ['Booking Details'],
    ['Date', 'Time', 'Status', 'Candidate Name', 'Candidate Email'],
  ];

  if (data.bookings.length === 0) {
    rows.push(['No bookings found for the selected range.']);
  } else {
    data.bookings.forEach((booking) => {
      rows.push([
        formatDateForCsv(booking.slotDate),
        formatTimeForCsv(booking.startTime),
        booking.status,
        booking.candidateName || '',
        booking.candidateEmail || '',
      ]);
    });
  }

  const csv = rows.map((row) => row.map(escapeCsvValue).join(',')).join('\n');
  return Buffer.from(csv, 'utf8');
}

router.get('/overview', async (req, res) => {
  try {
    const data = await fetchOverviewData(req.user, req.query);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/overview/pdf', requireRole('admin'), async (req, res) => {
  try {
    const data = await fetchOverviewData(req.user, req.query);
    const completionRate = data.totalBookings > 0
      ? Math.round((data.completed / data.totalBookings) * 100)
      : 0;
    const lines = [
      `Generated: ${new Date().toLocaleString('en-IN')}`,
      `Date Filter: ${req.query.from || 'All'} to ${req.query.to || 'All'}`,
      '',
      `Total Slots: ${data.totalSlots}`,
      `Total Bookings: ${data.totalBookings}`,
      `Scheduled: ${data.scheduled}`,
      `Completed: ${data.completed}`,
      `Cancelled: ${data.cancelled}`,
      `Completion Rate: ${completionRate}%`,
      '',
      'Booking Details',
      '----------------------------------------------------------------',
    ];

    if (data.bookings.length === 0) {
      lines.push('No bookings found for the selected range.');
    } else {
      data.bookings.forEach((booking, index) => {
        lines.push(
          `${index + 1}. ${booking.slotDate || '-'} ${String(booking.startTime || '-').slice(0, 5)} | ${booking.status.toUpperCase()} | ${booking.candidateName || booking.candidateEmail || 'Unknown candidate'}`
        );
      });
    }

    const pdf = createPdfBuffer('Interview Scheduling Overall Report', lines);
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="interview-report-${stamp}.pdf"`);
    return res.send(pdf);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/overview/csv', requireRole('admin'), async (req, res) => {
  try {
    const data = await fetchOverviewData(req.user, req.query);
    const csv = createCsvBuffer(data, req.query);
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="interview-report-${stamp}.csv"`);
    return res.send(csv);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
