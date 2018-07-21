import { version } from "./../src";

document.getElementById(
  "version"
)!.innerHTML = `Powered by <a href="https://github.com/uwdata/big-crossfilter">Big Crossfilter</a> ${version}`;

export function createElement(id: string) {
  const el = document.createElement("div");
  el.setAttribute("id", id);
  document.getElementById("app")!.appendChild(el);
  return el;
}
