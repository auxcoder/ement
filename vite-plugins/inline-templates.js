import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';

/**
 * Rollup plugin that inlines templateUrl/stylesUrl at build time.
 *
 * Transforms:
 *   static templateUrl = new URL('./user-card.html', import.meta.url);
 * Into:
 *   static template = '<div class="card">...</div>';
 *
 * And:
 *   static stylesUrl = new URL('./user-card.css', import.meta.url);
 * Into:
 *   static styles = ':host { display: block; }...';
 *
 * In development (Vite dev server), this plugin does NOT run —
 * components fetch templates at runtime and cache them per class.
 * This plugin only activates during `vite build`.
 */
export function inlineTemplates() {
  return {
    name: 'ng-modern-inline-templates',
    enforce: 'pre',

    transform(code, id) {
      // Only process .js files
      if (!id.endsWith('.js')) return null;

      // Skip if no templateUrl or stylesUrl present
      if (!code.includes('templateUrl') && !code.includes('stylesUrl')) return null;

      const templateUrlRegex =
        /static\s+templateUrl\s*=\s*new\s+URL\(\s*['"](.+?)['"]\s*,\s*import\.meta\.url\s*\)/g;
      const stylesUrlRegex =
        /static\s+stylesUrl\s*=\s*new\s+URL\(\s*['"](.+?)['"]\s*,\s*import\.meta\.url\s*\)/g;

      let transformed = code;
      let hasChanges = false;

      // Inline templates
      transformed = transformed.replace(templateUrlRegex, (match, relativePath) => {
        const filePath = resolve(dirname(id), relativePath);
        try {
          const content = readFileSync(filePath, 'utf-8')
            .replace(/\s+/g, ' ')     // collapse whitespace
            .replace(/> </g, '><')    // remove gaps between tags
            .replace(/<!--.*?-->/g, '') // remove HTML comments
            .trim();
          hasChanges = true;
          return `static template = ${JSON.stringify(content)}`;
        } catch (err) {
          this.warn(`Failed to inline template: ${filePath}\n${err.message}`);
          return match; // leave unchanged if file not found
        }
      });

      // Inline styles
      transformed = transformed.replace(stylesUrlRegex, (match, relativePath) => {
        const filePath = resolve(dirname(id), relativePath);
        try {
          const content = readFileSync(filePath, 'utf-8')
            .replace(/\/\*[\s\S]*?\*\//g, '') // remove block comments
            .replace(/\s+/g, ' ')              // collapse whitespace
            .trim();
          hasChanges = true;
          return `static styles = ${JSON.stringify(content)}`;
        } catch (err) {
          this.warn(`Failed to inline styles: ${filePath}\n${err.message}`);
          return match;
        }
      });

      return hasChanges ? { code: transformed, map: null } : null;
    },
  };
}
