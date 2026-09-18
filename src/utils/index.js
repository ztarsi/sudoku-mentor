/** Route path for a page name: spaces become dashes. */
export function createPageUrl(pageName) {
  return '/' + pageName.replace(/ /g, '-');
}
