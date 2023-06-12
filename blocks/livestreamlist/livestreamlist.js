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
      const li = document.createElement('li');

      li.innerHTML = `
      <a href="${post.path}">
          <img src="${post.image}" alt="${post.title}" />
          <h4>${post.title}</h4>
      </a>
    `;
      container.append(li);
    });



  block.append(container);
}
