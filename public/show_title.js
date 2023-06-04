var header_title = document.querySelector(".header-intro h1");
var header_subtitle = document.querySelector(".header-intro h2");

window.addEventListener("load", (event)=>{
  setTimeout(()=>{
    header_title.classList.remove("hiddenClass");
    header_title.classList.remove("shiftDown");
    header_subtitle.classList.remove("hiddenClass");
  }, 150)
})
