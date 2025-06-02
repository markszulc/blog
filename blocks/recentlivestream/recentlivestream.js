import { createOptimizedPicture } from '../../scripts/aem.js';

export default async function decorate(block) {
  const indexResponse = await fetch('/query-index.json');
  if (!indexResponse.ok) {
    return;
  }

  const index = await indexResponse.json();

  const container = document.createElement('ul');

  let featurecount = 0;

  index.data
    .forEach((post) => {
      if (post.category === 'livestream' && post.featured === 'true') {
        if (featurecount < 3) {
          const li = document.createElement('li');
          const eager = false;
          const picture = createOptimizedPicture(post.image, post.title || '', eager, [{ width: '750' }]);
          const pictureTag = picture.outerHTML;
          const card = document.createElement('a');
          card.href = '#';

          li.innerHTML = `
          <a href="${post.path}">
              ${pictureTag}
              <p>${post.title}</p>
          </a>
        `;
          container.append(li);
          featurecount += 1;
        }
      }
    });

  block.append(container);
}
