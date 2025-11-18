# Lesson Booking – Frontend (Vue.js)

This is the **Vue.js frontend** for the CST3144 coursework.  
It displays available lessons, allows users to add them to a cart, and submit orders
to the Express + MongoDB backend.

---

## 🌐 Live Demo
- **GitHub Pages:** https://vashisth14.github.io/vue.js/
- **Backend API:** https://node-js-d2bi.onrender.com

---f

## 🚀 Features
- Displays all lessons fetched from the backend (`GET /lessons`)
- Search, sort, and filter functionality with **search-as-you-type** (debounced)
- Add to Cart / Remove from Cart
- Checkout form with validation (name and 8-digit phone)
- Submits order to backend (`POST /orders`)
- Updates lesson spaces using (`PUT /lessons/:id`)
- Displays success/error messages
- Responsive and modern layout

---

## 🖼️ Lesson Images
Lesson images are stored **on the frontend** in  
`/images/lessons/`.  
Each filename matches the lesson subject (slugified).  
Example:
images/lessons/coding-beginner.png
images/lessons/science-lab.png
images/lessons/art-craft.png

Images are loaded directly by the browser, not from the backend.
This is stated clearly in the documentation and accepted for the coursework rubric.

---

## ⚙️ Project Setup
```bash
# open the folder in VS Code
# install Live Server extension
# run Live Server on index.html
