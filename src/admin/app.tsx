import type { StrapiApp } from '@strapi/strapi/admin';

/**
 * 날짜 문자열을 "yyyy-mm-dd HH:mm" 형식으로 변환
 * Strapi 어드민이 표시하는 날짜 형식: "Monday, January 12, 2026 at 6:08 PM"
 */
const reformatDate = (text: string): string | null => {
  const trimmed = text.trim();
  // "Weekday, Month Day, Year at H:MM AM/PM" 형식 매칭
  const match = trimmed.match(
    /^[A-Za-z]+,\s+([A-Za-z]+ \d{1,2}, \d{4})\s+at\s+(\d{1,2}:\d{2}\s+[AP]M)$/
  );
  if (!match) return null;

  try {
    const parsed = new Date(`${match[1]} ${match[2]}`);
    if (isNaN(parsed.getTime())) return null;

    const y = parsed.getFullYear();
    const mo = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    const h = String(parsed.getHours()).padStart(2, '0');
    const mi = String(parsed.getMinutes()).padStart(2, '0');

    return `${y}-${mo}-${d} ${h}:${mi}`;
  } catch {
    return null;
  }
};

/**
 * 주어진 DOM 요소 내에서 날짜 텍스트를 찾아 형식 변환
 */
const processNode = (node: Element) => {
  // 리프 노드(자식 없는 노드)만 대상으로 처리
  const candidates = node.querySelectorAll('td span, td p, td div, td');
  candidates.forEach((el) => {
    if (el.children.length === 0) {
      const text = el.textContent || '';
      const formatted = reformatDate(text);
      if (formatted) {
        el.textContent = formatted;
      }
    }
  });
};

export default {
  config: {
    locales: [
      // 'ko',
    ],
  },
  bootstrap(app: StrapiApp) {
    // MutationObserver로 DOM 변경 감지 → 날짜 형식 자동 변환
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            processNode(node as Element);
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  },
};
