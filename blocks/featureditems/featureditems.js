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
      if (post.featured === 'true') {
        if (featurecount < 3) {
          const li = document.createElement('li');
          const title = '';
          const eager = false;
          const picture = createOptimizedPicture(post.image, post.title || title, eager, [{ width: '380' }]);
          const pictureTag = picture.outerHTML;

          li.innerHTML = `
          <a href="${post.path}">
              ${pictureTag}
              <p class="title">${post.title}</p>
              <p class="description">${post.description}</p>
          </a>`;

          container.append(li);
          featurecount += 1;
        }
      }
    });

  block.append(container);
}
