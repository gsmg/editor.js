import SelectionUtils from "../selection";

import $ from "../dom";
import * as _ from "../utils";
import { API, InlineTool, SanitizerConfig } from "../../../types";
import { Notifier, Toolbar, I18n } from "../../../types/api";

/**
 * Link Tool
 *
 * Inline Toolbar Tool
 *
 * Wrap selected text with <a> tag
 */
export default class LinkInlineTool implements InlineTool {
  /**
   * Specifies Tool as Inline Toolbar Tool
   *
   * @returns {boolean}
   */
  public static isInline = true;

  /**
   * Title for hover-tooltip
   */
  public static title = "Link";

  /**
   * Sanitizer Rule
   * Leave <a> tags
   *
   * @returns {object}
   */
  public static get sanitize(): SanitizerConfig {
    return {
      a: {
        href: true,
        target: "_blank",
        rel: "nofollow",
      },
    } as SanitizerConfig;
  }

  /**
   * Native Document's commands for link/unlink
   */
  private readonly commandLink: string = "createLink";
  private readonly commandUnlink: string = "unlink";

  /**
   * Enter key code
   */
  private readonly ENTER_KEY: number = 13;

  /**
   * Styles
   */
  private readonly CSS = {
    button: "ce-inline-tool",
    buttonActive: "ce-inline-tool--active",
    buttonModifier: "ce-inline-tool--link",
    buttonUnlink: "ce-inline-tool--unlink",
    input: "ce-inline-tool-input",
    inputShowed: "ce-inline-tool-input--showed",
  };

  /**
   * Elements
   */
  private nodes: {
    button: HTMLButtonElement;
    input: HTMLInputElement;
    target: HTMLInputElement;
  } = {
    button: null,
    input: null,
    target: null,
  };

  /**
   * SelectionUtils instance
   */
  private selection: SelectionUtils;

  /**
   * Input opening state
   */
  private inputOpened = false;

  /**
   * Available Toolbar methods (open/close)
   */
  private toolbar: Toolbar;

  /**
   * Available inline toolbar methods (open/close)
   */
  private inlineToolbar: Toolbar;

  /**
   * Notifier API methods
   */
  private notifier: Notifier;

  /**
   * I18n API
   */
  private i18n: I18n;

  /**
   * @param {API} api - Editor.js API
   */
  constructor({ api }) {
    this.toolbar = api.toolbar;
    this.inlineToolbar = api.inlineToolbar;
    this.notifier = api.notifier;
    this.i18n = api.i18n;
    this.selection = new SelectionUtils();
  }

  /**
   * Create button for Inline Toolbar
   */
  public render(): HTMLElement {
    this.nodes.button = document.createElement("button") as HTMLButtonElement;
    this.nodes.button.type = "button";
    this.nodes.button.classList.add(this.CSS.button, this.CSS.buttonModifier);
    this.nodes.button.appendChild($.svg("link", 14, 10));
    this.nodes.button.appendChild($.svg("unlink", 15, 11));

    return this.nodes.button;
  }

  /**
   * Input for the link
   */
  public renderActions(): HTMLElement {
    const wrap = document.createElement("div") as HTMLDivElement;

    this.nodes.input = document.createElement("input") as HTMLInputElement;
    this.nodes.input.placeholder = this.i18n.t("Add a link");
    this.nodes.input.classList.add(this.CSS.input);
    this.nodes.input.addEventListener("change", (e) => {
      const tb = document.querySelector(".ce-inline-toolbar") as HTMLDivElement;
      tb.style.width = `${this.nodes.input.value.length * 8}px`;
      tb.style.minWidth = "168px";
    });
    this.nodes.input.addEventListener("keydown", (event: KeyboardEvent) => {
      if (event.keyCode === this.ENTER_KEY) {
        this.enterPressed(event);
      }
    });

    this.nodes.target = document.createElement("input") as HTMLInputElement;
    this.nodes.target.type = "checkbox";
    this.nodes.target.className = "ml-2";

    const label = document.createElement("label") as HTMLLabelElement;
    label.className = "p-2 d-flex align-items-center";
    label.innerHTML = "Neuer Tab";

    const ok = document.createElement("button") as HTMLButtonElement;
    ok.type = "button";
    ok.className = "p-2";
    ok.setAttribute(
      "style",
      "border: none; background: #0a861f; width: 100%; display: block; color: white;"
    );
    ok.innerHTML = `Speichern`;
    ok.addEventListener("click", (e) => {
      this.enterPressed();
    });

    const utils = document.createElement("div") as HTMLDivElement;
    utils.className = "d-none";

    label.appendChild(this.nodes.target);

    utils.appendChild(this.nodes.input);
    utils.appendChild(label);
    utils.appendChild(ok);

    wrap.appendChild(utils);

    return wrap;
  }

  /**
   * Handle clicks on the Inline Toolbar icon
   *
   * @param {Range} range - range to wrap with link
   */
  public surround(range: Range): void {
    /**
     * Range will be null when user makes second click on the 'link icon' to close opened input
     */
    if (range) {
      /**
       * Save selection before change focus to the input
       */
      if (!this.inputOpened) {
        /** Create blue background instead of selection */
        this.selection.setFakeBackground();
        this.selection.save();
      } else {
        this.selection.restore();
        this.selection.removeFakeBackground();
      }
      const parentAnchor = this.selection.findParentTag("A");

      /**
       * Unlink icon pressed
       */
      if (parentAnchor) {
        this.selection.expandToTag(parentAnchor);
        this.unlink();
        this.closeActions();
        this.checkState();
        this.toolbar.close();

        return;
      }
    }

    this.toggleActions();
  }

  /**
   * Check selection and set activated state to button if there are <a> tag
   *
   * @param {Selection} selection - selection to check
   */
  public checkState(selection?: Selection): boolean {
    const anchorTag = this.selection.findParentTag("A");

    if (anchorTag) {
      this.nodes.button.classList.add(this.CSS.buttonUnlink);
      this.nodes.button.classList.add(this.CSS.buttonActive);
      this.openActions();

      /**
       * Fill input value with link href
       */
      const hrefAttr = anchorTag.getAttribute("href");
      const targetAttr = anchorTag.getAttribute("target");

      this.nodes.input.value = hrefAttr !== "null" ? hrefAttr : "";
      const tb = document.querySelector(".ce-inline-toolbar") as HTMLDivElement;
      tb.style.width = `${this.nodes.input.value.length * 8}px`;
      tb.style.minWidth = "168px";

      this.nodes.target.checked = targetAttr === "_blank";

      this.selection.save();
    } else {
      this.nodes.button.classList.remove(this.CSS.buttonUnlink);
      this.nodes.button.classList.remove(this.CSS.buttonActive);
    }

    return !!anchorTag;
  }

  /**
   * Function called with Inline Toolbar closing
   */
  public clear(): void {
    this.closeActions();
  }

  /**
   * Set a shortcut
   */
  public get shortcut(): string {
    return "CMD+K";
  }

  /**
   * Show/close link input
   */
  private toggleActions(): void {
    if (!this.inputOpened) {
      this.openActions(true);
    } else {
      this.closeActions(false);
    }
  }

  /**
   * @param {boolean} needFocus - on link creation we need to focus input. On editing - nope.
   */
  private openActions(needFocus = false): void {
    this.nodes.input.parentElement.classList.remove("d-none");
    if (needFocus) {
      this.nodes.input.focus();
    }
    this.inputOpened = true;
  }

  /**
   * Close input
   *
   * @param {boolean} clearSavedSelection — we don't need to clear saved selection
   *                                        on toggle-clicks on the icon of opened Toolbar
   */
  private closeActions(clearSavedSelection = true): void {
    if (this.selection.isFakeBackgroundEnabled) {
      // if actions is broken by other selection We need to save new selection
      const currentSelection = new SelectionUtils();

      currentSelection.save();

      this.selection.restore();
      this.selection.removeFakeBackground();

      // and recover new selection after removing fake background
      currentSelection.restore();
    }

    this.nodes.input.parentElement.classList.add("d-none");
    this.nodes.input.value = "";
    this.nodes.target.checked = false;
    if (clearSavedSelection) {
      this.selection.clearSaved();
    }
    this.inputOpened = false;
  }

  /**
   * Enter pressed on input
   *
   * @param {KeyboardEvent} event - enter keydown event
   */
  private enterPressed(event?: KeyboardEvent): void {
    let value = this.nodes.input.value || "";
    const target = this.nodes.target.checked ? "_blank" : "self";

    if (!value.trim()) {
      this.selection.restore();
      this.unlink();
      if (event) {
        event.preventDefault();
      }
      this.closeActions();
    }

    if (!this.validateURL(value)) {
      this.notifier.show({
        message: "Pasted link is not valid.",
        style: "error",
      });

      _.log("Incorrect Link pasted", "warn", value);

      return;
    }

    value = this.prepareLink(value);

    this.selection.restore();
    this.selection.removeFakeBackground();

    this.insertLink(value, target);

    /**
     * Preventing events that will be able to happen
     */
    if (event) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }
    this.selection.collapseToEnd();
    this.inlineToolbar.close();
  }

  /**
   * Detects if passed string is URL
   *
   * @param {string} str - string to validate
   * @returns {boolean}
   */
  private validateURL(str: string): boolean {
    /**
     * Don't allow spaces
     */
    return !/\s/.test(str);
  }

  /**
   * Process link before injection
   * - sanitize
   * - add protocol for links like 'google.com'
   *
   * @param {string} link - raw user input
   */
  private prepareLink(link: string): string {
    link = link.trim();
    link = this.addProtocol(link);

    return link;
  }

  /**
   * Add 'http' protocol to the links like 'vc.ru', 'google.com'
   *
   * @param {string} link - string to process
   */
  private addProtocol(link: string): string {
    /**
     * If protocol already exists, do nothing
     */
    if (/^(\w+):(\/\/)?/.test(link)) {
      return link;
    }

    /**
     * We need to add missed HTTP protocol to the link, but skip 2 cases:
     *     1) Internal links like "/general"
     *     2) Anchors looks like "#results"
     *     3) Protocol-relative URLs like "//google.com"
     */
    const isInternal = /^\/[^/\s]/.test(link),
      isAnchor = link.substring(0, 1) === "#",
      isProtocolRelative = /^\/\/[^/\s]/.test(link);

    if (!isInternal && !isAnchor && !isProtocolRelative) {
      link = "http://" + link;
    }

    return link;
  }

  /**
   * Inserts <a> tag with "href"
   *
   * @param {string} link - "href" value
   */
  private insertLink(link: string, target = "self"): void {
    /**
     * Edit all link, not selected part
     */
    const anchorTag = this.selection.findParentTag("A");

    if (anchorTag) {
      this.selection.expandToTag(anchorTag);
    }

    document.execCommand(this.commandLink, false, link);
    const selection = document.getSelection();
    if (selection.anchorNode.nodeName.toLowerCase() === '#text' &&
      selection.anchorNode.parentElement.nodeName.toLowerCase() === 'a') {
      selection.anchorNode.parentElement.setAttribute('target', target);
    } else {
      const commonAncestor = selection.getRangeAt(0).commonAncestorContainer as HTMLElement;

      if (commonAncestor.tagName.toLowerCase() === 'a') {
        commonAncestor.setAttribute('target', target);
      } else {
        commonAncestor
          .querySelectorAll('a')
          .forEach((node) => {
            const href = node.getAttribute('href');
            console.log('second inner', href, target, link);
            if (href.trim().toLowerCase() === link.trim().toLowerCase()) {
              node.setAttribute('target', target);
            }
          });
      }
    }
  }

  /**
   * Removes <a> tag
   */
  private unlink(): void {
    document.execCommand(this.commandUnlink);
  }
}
