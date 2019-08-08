import { version } from "../src";

document.getElementById(
  "version"
)!.innerHTML = `Powered by <a href="https://github.com/uwdata/falcon">Falcon</a> ${version}`;

export function createElement(id: string, numOfElements: number) {
  const el = document.createElement("div");
  el.setAttribute("id", id);
  el.style.height = `calc(100% / ${numOfElements})`;
  el.style.width = '100%';
  document.getElementById("app")!.appendChild(el);
  return el;
}
