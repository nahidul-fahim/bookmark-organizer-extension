document.addEventListener("DOMContentLoaded", async function () {
  const categoryList = document.getElementById("category-list");
  const newCategoryInput = document.getElementById("new-category");
  const addCategoryButton = document.getElementById("add-category");
  const bookmarkList = document.getElementById("bookmark-list");
  const searchInput = document.getElementById("search");

  try {
    await loadBookmarks();
    await loadCategories();
    await updateBookmarkCategories();

    searchInput.addEventListener("input", function () {
      const query = searchInput.value.toLowerCase();
      filterBookmarks(query);
    });
  } catch (error) {
    console.error("Error loading bookmarks:", error);
  }

  //   load all bookmarks
  async function loadBookmarks() {
    try {
      const bookmarkTree = await getBookmarks();
      bookmarkList.innerHTML = "";
      bookmarkTree.forEach(processBookmarkTree);
    } catch (error) {
      console.error("Error getting bookmarks:", error);
    }
  }

  //   get the bookmarks
  function getBookmarks() {
    return new Promise((resolve, reject) => {
      chrome.bookmarks.getTree(function (bookmarkTree) {
        if (chrome.runtime.lastError) {
          return reject(chrome.runtime.lastError);
        }
        resolve(bookmarkTree);
      });
    });
  }

  //   process the bookmark tree
  function processBookmarkTree(node) {
    if (node.url) {
      displayBookmark(node);
    }
    if (node.children) {
      node.children.forEach(processBookmarkTree);
    }
  }

  //   display the bookmarks
  function displayBookmark(bookmark) {
    const li = document.createElement("p");
    li.classList.add("bookmark");
    li.textContent = bookmark.title;
    li.setAttribute("data-id", bookmark.id);

    // category dropdown
    const categoryDropdown = document.createElement("select");
    categoryDropdown.addEventListener("change", () =>
      assignCategory(bookmark, categoryDropdown.value)
    );
    populateCategoryDropdown(categoryDropdown);

    li.appendChild(categoryDropdown);
    bookmarkList.appendChild(li);
  }

  //   category dropdown
  function populateCategoryDropdown(dropdown) {
    getCategories().then((categories) => {
      dropdown.innerHTML = '<option value="">Select category</option>';
      categories.forEach((category) => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        dropdown.appendChild(option);
      });
    });
  }

  //   filter bookmarks according to search query
  function filterBookmarks(query) {
    const bookmarks = document.querySelectorAll(".bookmark");
    bookmarks.forEach((bookmark) => {
      const shouldDisplay = bookmark.textContent.toLowerCase().includes(query);
      bookmark.style.display = shouldDisplay ? "" : "none";
    });
  }

  //   add category button functionality
  addCategoryButton.addEventListener("click", async function () {
    const newCategory = newCategoryInput.value.trim();
    if (newCategory) {
      await addCategory(newCategory);
      newCategoryInput.value = "";
      await loadCategories();
    }
  });

  // add new category
  async function addCategory(newCategory) {
    let categories = await getCategories();
    if (!categories.includes(newCategory)) {
      categories.push(newCategory);
      await chrome.storage.sync.set({ categories });
    }
  }

  //   load all the categories
  async function loadCategories() {
    const categories = await getCategories();
    categoryList.innerHTML = "";

    // Add 'All' category
    const allCategoriesList = document.createElement("p");
    allCategoriesList.textContent = "All";
    allCategoriesList.classList.add("category-item");
    allCategoriesList.addEventListener("click", () => filterByCategory("All"));
    categoryList.appendChild(allCategoriesList);

    // Add other categories
    categories.forEach((category) => {
      const p = document.createElement("p");
      p.textContent = category;
      p.classList.add("category-item");
      p.addEventListener("click", () => filterByCategory(category));
      categoryList.appendChild(p);
    });
  }

  //   get all the categories
  function getCategories() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(["categories"], function (result) {
        resolve(result.categories || []);
      });
    });
  }

  //   assign a category to bookmark
  async function assignCategory(bookmark, category) {
    let bookmarksWithCategories = await getBookmarksWithCategories();
    bookmarksWithCategories[bookmark.id] = category;
    await chrome.storage.sync.set({ bookmarksWithCategories });
  }

  function getBookmarksWithCategories() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(["bookmarksWithCategories"], function (result) {
        resolve(result.bookmarksWithCategories || {});
      });
    });
  }

  //   filter the bookmarks with categories
  async function filterByCategory(category) {
    const bookmarksWithCategories = await getBookmarksWithCategories();
    const bookmarks = document.querySelectorAll(".bookmark");
    bookmarks.forEach((bookmark) => {
      const bookmarkId = bookmark.getAttribute("data-id");
      const bookmarkCategory = bookmarksWithCategories[bookmarkId];

      bookmark.style.display =
        bookmarkCategory === category || category === "All" ? "" : "none";
    });
  }

  //   update the bookmark categories
  async function updateBookmarkCategories() {
    const bookmarksWithCategories = await getBookmarksWithCategories();
    const bookmarks = document.querySelectorAll(".bookmark");

    bookmarks.forEach((bookmark) => {
      const bookmarkId = bookmark.getAttribute("data-id");
      const category = bookmarksWithCategories[bookmarkId];
      if (category) {
        const dropdown = bookmark.querySelector("select");
        if (dropdown) {
          dropdown.value = category;
        }
      }
    });
  }

  // Make filterByCategory accessible globally
  window.filterByCategory = filterByCategory;
});
