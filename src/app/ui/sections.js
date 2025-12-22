// src/app/ui/sections.js

/**
 * Replacement for duplicated mkSection() in entities.js and practices.js
 */
export function appendSection(container, label, contentBuilder, opts = {}) {
  const {
    headingClassName = 'section-heading small',
    sectionFontSize = '0.8rem',
    sectionClassName = ''
  } = opts;

  const heading = document.createElement('div');
  heading.className = headingClassName;
  heading.textContent = label;
  container.appendChild(heading);

  const section = document.createElement('div');
  if (sectionClassName) section.className = sectionClassName;
  section.style.fontSize = sectionFontSize;
  container.appendChild(section);

  if (typeof contentBuilder === 'function') contentBuilder(section);

  return { heading, section };
}
