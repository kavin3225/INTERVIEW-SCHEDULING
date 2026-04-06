export function getPrivateCandidateLabel(candidate, fallbackId = '') {
  const id = candidate?.id || fallbackId;
  return id ? `Candidate #${id}` : 'Private Candidate';
}

export function getCandidateDisplayLabel(candidate, viewerRole, fallbackId = '') {
  if (viewerRole === 'candidate') {
    return candidate?.name || candidate?.email || getPrivateCandidateLabel(candidate, fallbackId);
  }
  return getPrivateCandidateLabel(candidate, fallbackId);
}

export function getMaskedEmail(email) {
  if (!email) return 'Hidden';
  const [localPart, domain = ''] = String(email).split('@');
  if (!localPart) return 'Hidden';
  const visible = localPart.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(localPart.length - visible.length, 3))}${domain ? `@${domain}` : ''}`;
}
