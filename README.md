After-School Lessons – Full Stack Coursework (CST3144)

A full-stack web application built for the CST3144 – Full Stack Development module.
The system allows users to browse available lessons, manage their cart, and submit orders.
This project includes a Vue.js frontend hosted on GitHub Pages and a Node.js + Express backend hosted on Render, connected to MongoDB Atlas.

---

# Live Demo

Frontend (GitHub Pages)
 https://vashisth14.github.io/vue.js/

Backend API (Render)
 https://node-js-d2bi.onrender.com

Frontend (GitHub Repository #1)
  ├── index.html
  ├── app.js
  ├── style.css
  ├── images/
  ├── README.md

# Features
Lesson catalogue with sorting (subject, location, price, spaces)

Search-as-you-type (fetches from backend)

Pagination-ready layout

Dynamic cart with grouped items

Quantity control (+ / –)

Remaining spaces validation

Order Summary (Subtotal, VAT, Total)

Checkout form (Name & Phone validation)

Smooth navigation between pages

Fully responsive design

CSP (Content-Security-Policy) protection

Deployed entirely on GitHub Pages

---

## Lesson Images
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

##  Project Setup
```bash
# open the folder in VS Code
# install Live Server extension
# run Live Server on index.html
