// JSDOM has no layout engine. Real image geometry is covered by Playwright.
if (!Range.prototype.getBoundingClientRect) Range.prototype.getBoundingClientRect = () => new DOMRect(0, 0, 0, 0)
if (!Range.prototype.getClientRects) Range.prototype.getClientRects = () => [] as unknown as DOMRectList
if (!document.elementFromPoint) document.elementFromPoint = () => null
