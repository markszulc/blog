import { createOptimizedPicture } from '../../scripts/aem.js';

export default async function decorate(block) {
  const indexResponse = await fetch('/query-index.json');
  if (!indexResponse.ok) {
    return;
  }

  const container = document.createElement('ul');
  container.classList.add('category-list');
  const index = await indexResponse.json();

  const props = [...block.children].map((row) => row.firstElementChild);
  props.forEach((el) => {
    const category = el.textContent;
    container.classList.add(`category-list--${category}`);

    index.data
      .forEach((post) => {
        if (post.category !== category) {
          return;
        }
        const li = document.createElement('li');
        const picture = createOptimizedPicture(post.image, '', false, [{ width: 500 }]);
        const date = post['publication-date'];

        li.innerHTML = `
        <a href="${post.path}">
            <div class="picture">
            ${picture.outerHTML}
            </div>
            <div class="content">
              <h4>${post.title}</h4>
              <p>${post.description}</p>
              <p>Published: ${date}</p>
            </div>
        </a>
      `;
        container.append(li);
      });
  });

  block.innerHTML = container.outerHTML;
}
