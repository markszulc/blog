import { createOptimizedPicture } from '../../scripts/lib-franklin.js';

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
      if (post.category === 'livestream') {
        if (featurecount < 3) {
          const li = document.createElement('li');
          const eager = false;
          const picture = createOptimizedPicture(post.image, post.title || title, eager, [{ width: '750' }]);
          const pictureTag = picture.outerHTML;
          const card = document.createElement('a');
          card.className = `foo-card`;
          card.href = "#";

          li.innerHTML = `
          <a href="${post.path}">
              ${pictureTag}
              <p>${post.title}</p>
          </a>
        `;
          container.append(li);
          featurecount++;
    }
  }
});

  block.append(container);
}

