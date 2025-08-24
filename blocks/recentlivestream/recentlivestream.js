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

          // Format publication date
          let formattedDate = '';
          if (post['publication-date']) {
            const date = new Date(post['publication-date']);
            if (!isNaN(date.getTime())) {
              formattedDate = date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              });
            }
          }

          li.innerHTML = `
          <a href="${post.path}">
              ${pictureTag}
            <p class="title">${post.title}</p>
            <p class="description">${post.description}</p>
          </a>
          ${formattedDate ? `<div class="date"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-calendar w-4 h-4" aria-hidden="true"><path d="M8 2v4"></path><path d="M16 2v4"></path><rect width="18" height="18" x="3" y="4" rx="2"></rect><path d="M3 10h18"></path></svg><span class="pubdate">${formattedDate}</span></div>` : ''}
        `;
          container.append(li);
          featurecount += 1;
        }
      }
    });

  block.append(container);
}
