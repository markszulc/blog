import {
    getBlogArticle,
    buildArticleCard
  } from '../../scripts/scripts.js';
  
  async function decorateRecentLiveStreams(recentStreamsEl, paths) {

    const articleCardsContainer = document.createElement('div');
    articleCardsContainer.className = 'article-cards';
    for (let i = 0; i < paths.length; i += 1) {
      const articlePath = paths[i];
      // eslint-disable-next-line no-await-in-loop
      const article = await getBlogArticle(articlePath);
      if (article) {
        console.log(article);
        const card = buildArticleCard(article);
        articleCardsContainer.append(card);
        recentStreamsEl.append(articleCardsContainer);
      } else {
        const { origin } = new URL(window.location.href);
        // eslint-disable-next-line no-console
        console.warn(`Recommended article does not exist or is missing in index: ${origin}${articlePath}`);
      }
    }
    if (articleCardsContainer.childElementCount === 0) {
       // recentStreamsEl.parentNode.parentNode.remove();
    }
  }

export default function decorate(blockEl) {
    const anchors = [...blockEl.querySelectorAll('a')];
    blockEl.innerHTML = '';
    const paths = anchors.map((a) => new URL(a.href).pathname);
    decorateRecentLiveStreams(blockEl, paths);
  }