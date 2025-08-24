import { createOptimizedPicture } from '../../scripts/aem.js';

export default async function decorate(block) {
  const indexResponse = await fetch('/query-index.json');
  if (!indexResponse.ok) {
    return;
  }

  const index = await indexResponse.json();

  const container = document.createElement('ul');

  index.data
    .forEach((post) => {
      if (post.category !== 'livestream') {
        return;
      }
      const eager = false;
      const title = '';
      const li = document.createElement('li');
      const picture = createOptimizedPicture(post.image, post.title || title, eager, [{ width: '750' }]);
      const pictureTag = picture.outerHTML;

      li.innerHTML = `
      <a href="${post.path}">
        ${pictureTag}
        <p class="title">${post.title}</p>
        <p class="description">${post.description}</p>
      </a>
    `;
      container.append(li);
    });

  block.append(container);
}
