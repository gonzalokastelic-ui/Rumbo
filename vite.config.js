import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// La landing es un chunk diferido: se precarga desde el HTML para que el titulo
// no espere a que termine de bajar el bundle principal (mejora el LCP en celulares).
function precargarLanding() {
  return {
    name: 'precargar-landing',
    apply: 'build',
    transformIndexHtml(html, ctx) {
      const chunks = Object.values(ctx.bundle || {})
      const landing = chunks.find((c) => c.type === 'chunk' && c.facadeModuleId?.endsWith('/pages/Landing.jsx'))
      if (!landing) return html
      // El chunk de la landing y todo lo que importa (datos, iconos, Nav), sin el bundle principal
      const deps = new Set()
      const visitar = (nombre) => {
        const c = ctx.bundle[nombre]
        if (!c || c.isEntry || deps.has(nombre)) return
        deps.add(nombre)
        c.imports.forEach(visitar)
      }
      visitar(landing.fileName)
      const css = [...(landing.viteMetadata?.importedCss || [])]
      const links = [
        ...[...deps].map((f) => ['modulepreload', `/${f}`]),
        ...css.map((href) => ['preload', `/${href}`, 'style']),
      ]
      // Solo en la portada: las demas rutas no necesitan GSAP
      const js = `if(location.pathname==='/'){${links
        .map(([rel, href, as]) => `l=document.createElement('link');l.rel='${rel}';l.href='${href}';${as ? `l.as='${as}';` : ''}document.head.appendChild(l);`)
        .join('')}}`
      return [{ tag: 'script', children: `(function(){var l;${js}})();`, injectTo: 'head' }]
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), precargarLanding()],
  test: {
    include: ['tests/**/*.test.js'],
  },
})
