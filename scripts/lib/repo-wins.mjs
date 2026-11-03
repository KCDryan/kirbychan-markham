/**
 * Posts where the website's own file (src/content/blog) wins over the version saved at /upload/:
 * functions/blog/[[path]].ts serves the built page and keeps the saved one off the /blog/ list,
 * and scripts/pull-uploads.mjs never replaces the file. For a saved version that is out of date
 * and cannot be removed from the database. Every other post works as the upload page describes.
 */
export const REPO_WINS = ['downsizing-in-milliken-mills-a-markham-homeowners-guide'];
