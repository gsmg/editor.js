export default class Wordformatter {
  public clean(data: string, currentBlockName: string): string {
    const tmp = document.createElement("div");
    tmp.innerHTML = data;

    let cleaned = "";

    const cleanWordShit = (str): string => {
      return str.replace("·", "").replace(/\&nbsp;/g, "");
    };

    Array.from(tmp.children).forEach((child) => {
      if (child.classList.contains("MsoListParagraphCxSpFirst")) {
        cleaned += `<ul><li>${cleanWordShit(child.innerHTML)}</li>`;
        return;
      }

      if (child.classList.contains("MsoListParagraphCxSpMiddle")) {
        cleaned += `<li>${cleanWordShit(child.innerHTML)}</li>`;
        return;
      }

      if (child.classList.contains("MsoListParagraphCxSpLast")) {
        cleaned += `<li>${cleanWordShit(child.innerHTML)}</li></ul>`;
        return;
      }

      cleaned += child.outerHTML;
    });

    if (!["paragraph", "header"].includes(currentBlockName)) {
      cleaned = cleaned.replace(/(<(\/?p[^>]*)>)/gi, "");
    }

    return cleaned;
  }
}
