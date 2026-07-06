import twemoji from '@twemoji/api';

const BASE = 'https://twemoji.exerinity.com/svg';

function parse(node: HTMLElement) {
  twemoji.parse(node, {
    callback: (icon) => `${BASE}/${icon}.svg`,
    attributes: () => ({ loading: 'lazy', decoding: 'async' }),
  });
}

export function initTwemoji() {
  const root = document.body;
  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      parse(root);
    });
  };

  parse(root);
  new MutationObserver(schedule).observe(root, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}
