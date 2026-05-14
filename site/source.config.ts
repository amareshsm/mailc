import { defineDocs, defineConfig } from 'fumadocs-mdx/config'

// Docs collection — MDX under content/docs
export const docs = defineDocs({
  dir: 'content/docs',
})

// Blog collection — MDX under content/blog
// Frontmatter schema can be tightened later (author/date/tags) once we add zod.
export const blog = defineDocs({
  dir: 'content/blog',
})

export default defineConfig({
  mdxOptions: {
    // Future: add rehype/remark plugins here
  },
})
