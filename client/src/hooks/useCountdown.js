import { useState, useEffect } from 'react';

export function useCountdown(slotDate, startTime) {
  const [label, setLabel] = useState('');

  useEffect(() => {
    if (!slotDate || !startTime) return;
    const target = new Date(`${slotDate}T${startTime}`);

    function tick() {
      const diff = target - Date.now();
      if (diff <= 0) { setLabel('Starting now'); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (d > 0) setLabel(`${d}d ${h}h ${m}m`);
      else if (h > 0) setLabel(`${h}h ${m}m ${s}s`);
      else setLabel(`${m}m ${s}s`);
    }

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [slotDate, startTime]);

  return label;
}
