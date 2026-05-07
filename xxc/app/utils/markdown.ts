import {marked} from 'marked';
import Lang from '~/app/core/lang';
import DOMPurify from 'dompurify';

const SPECIAL_CHARACTERS = Object.freeze({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
});

const DOMPURIFY_CFG = Object.freeze({
    USE_PROFILES: {html: true},
    ALLOWED_TAGS: ['b', 'blockquote', 'code', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'ol', 'ul', 'p', 'pre', 'address', 's', 'i', 'sub', 'sup', 'strong', 'kbd', 'del', 'mark', 'ins', 'hr', 'var', 'table', 'tr', 'table', 'tr', 'thead', 'th', 'td', 'tfoot', 'tbody', 'img', 'div', 'span', 'dl', 'dt', 'dd', 'abbr', 'summary', 'open', 'a'],
    ALLOWED_ATTR: ['class', 'href', 'colspan', 'rowspan', 'width', 'height', 'src', 'alt', 'title'],
    FORBID_TAGS: ['style', 'script', 'link', 'input', 'checkbox', 'radio', 'textarea', 'button', 'iframe'],
    FORBID_ATTR: ['style'],
});

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (key: keyof typeof SPECIAL_CHARACTERS) => SPECIAL_CHARACTERS[key]);

marked.use({
    // If true, use GFM hard and soft line breaks. Requires gfm be true.
    breaks: true,
    // If true, use approved GitHub Flavored Markdown (GFM) specification.
    gfm: true,
    // If true, the parser does not throw any exception.
    silent: !DEBUG,

    renderer: {
        code({text, lang}) {
            return `<pre class="code-block" ${lang ? ` data-lang="${lang}"` : ''}><a class="hint--left btn-copy-code app-link" href="!copyCode/" data-hint="${Lang.string('common.copyCode')}"><button class="btn iconbutton -rounded primary-pale text-primary" type="button"><i class="icon mdi mdi-code-not-equal-variant icon-2x"></i></button></a><code${lang ? ` data-lang="${lang}"` : ''}>${escapeHtml(text)}</code></pre>`;
        },
        html({text}) {
            return DOMPurify.sanitize(text, DOMPURIFY_CFG);
        }
    }
})

export default marked;
