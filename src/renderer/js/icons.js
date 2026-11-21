/**
 * Lucide Icons SVG Provider
 * Ícones vetoriais modernos, limpos e de alta definição para substituir emojis.
 */

const LucideIcons = {
  createSvg(content, size = 18, className = '') {
    return `<svg class="lucide ${className}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${content}</svg>`;
  },

  shield(size = 18, cls = '') {
    return this.createSvg('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>', size, cls);
  },

  shieldCheck(size = 18, cls = '') {
    return this.createSvg('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>', size, cls);
  },

  shieldAlert(size = 18, cls = '') {
    return this.createSvg('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>', size, cls);
  },

  cpu(size = 18, cls = '') {
    return this.createSvg('<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3"/>', size, cls);
  },

  monitor(size = 18, cls = '') {
    return this.createSvg('<rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>', size, cls);
  },

  hardDrive(size = 18, cls = '') {
    return this.createSvg('<line x1="22" x2="2" y1="12" y2="12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/><line x1="6" x2="6.01" y1="16" y2="16"/><line x1="10" x2="10.01" y1="16" y2="16"/>', size, cls);
  },

  activity(size = 18, cls = '') {
    return this.createSvg('<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>', size, cls);
  },

  zap(size = 18, cls = '') {
    return this.createSvg('<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>', size, cls);
  },

  trash2(size = 18, cls = '') {
    return this.createSvg('<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>', size, cls);
  },

  globe(size = 18, cls = '') {
    return this.createSvg('<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>', size, cls);
  },

  sparkles(size = 18, cls = '') {
    return this.createSvg('<path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>', size, cls);
  },

  gamepad2(size = 18, cls = '') {
    return this.createSvg('<line x1="6" x2="10" y1="12" y2="12"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="15" x2="15.01" y1="13" y2="13"/><line x1="18" x2="18.01" y1="11" y2="11"/><rect width="20" height="12" x="2" y="6" rx="6"/>', size, cls);
  },

  folderArchive(size = 18, cls = '') {
    return this.createSvg('<circle cx="10" cy="20" r="2"/><circle cx="18" cy="20" r="2"/><path d="M16 20h-4"/><path d="M2 20h2"/><path d="M22 20h-2"/><path d="M2 10V6a2 2 0 0 1 2-2h4l2 2h10a2 2 0 0 1 2 2v4"/><rect width="20" height="8" x="2" y="10" rx="2"/>', size, cls);
  },

  archive(size = 18, cls = '') {
    return this.createSvg('<rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/>', size, cls);
  },

  code2(size = 18, cls = '') {
    return this.createSvg('<path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/>', size, cls);
  },

  gitBranch(size = 18, cls = '') {
    return this.createSvg('<line x1="6" x2="6" y1="3" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>', size, cls);
  },

  server(size = 18, cls = '') {
    return this.createSvg('<rect width="20" height="8" x="2" y="2" rx="2" ry="2"/><rect width="20" height="8" x="2" y="14" rx="2" ry="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/>', size, cls);
  },

  container(size = 18, cls = '') {
    return this.createSvg('<path d="M22 7.7 12 2 2 7.7v8.6l10 5.7 10-5.7z"/><path d="M12 22v-8.5"/><path d="m22 7.7-10 5.8L2 7.7"/><path d="m7 4.9 10 5.8"/>', size, cls);
  },

  messageSquare(size = 18, cls = '') {
    return this.createSvg('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>', size, cls);
  },

  mousePointer(size = 18, cls = '') {
    return this.createSvg('<path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="m13 13 6 6"/>', size, cls);
  },

  bellOff(size = 18, cls = '') {
    return this.createSvg('<path d="M8.7 3A6 6 0 0 1 18 8a21.3 21.3 0 0 0 .6 5"/><path d="M17 17H3s3-2 3-9a4.67 4.67 0 0 1 .3-1.7"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/><line x1="2" x2="22" y1="2" y2="22"/>', size, cls);
  },

  checkCircle2(size = 18, cls = '') {
    return this.createSvg('<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>', size, cls);
  },

  xCircle(size = 18, cls = '') {
    return this.createSvg('<circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/>', size, cls);
  },

  info(size = 18, cls = '') {
    return this.createSvg('<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="16" y2="12"/><line x1="12" x2="12.01" y1="8" y2="8"/>', size, cls);
  },

  alertTriangle(size = 18, cls = '') {
    return this.createSvg('<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/>', size, cls);
  },

  download(size = 18, cls = '') {
    return this.createSvg('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>', size, cls);
  },

  externalLink(size = 18, cls = '') {
    return this.createSvg('<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/>', size, cls);
  },

  layers(size = 18, cls = '') {
    return this.createSvg('<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>', size, cls);
  },

  windows(size = 18, cls = '') {
    return this.createSvg('<path d="M3 5.5 10 4.5v6.5H3zM11 4.3 21 3v8h-10zM3 13h7v6.5L3 18.5zM11 13h10v8l-10-1.3z"/>', size, cls);
  },

  apps(size = 18, cls = '') {
    return this.createSvg('<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>', size, cls);
  },

  get(name, size = 18, cls = '') {
    const fn = this[name];
    if (typeof fn === 'function') {
      return fn.call(this, size, cls);
    }
    return this.apps(size, cls);
  }
};

window.LucideIcons = LucideIcons;
