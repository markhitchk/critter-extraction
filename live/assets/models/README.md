# Standalone gameplay model files

The development page at `live/model-file-test.html` expects every visible gameplay model to live in its own physical JavaScript file under this folder.

Each model file must register itself with:

```js
window.CritterStandaloneModels.register({
  category: 'critters',
  id: 'puppy',
  sourceFile: 'assets/models/critters/puppy.model.js',
  recipe: {
    // Complete model-specific recipe data.
  }
});
```

Expected folders:

- `critters/`
- `weapons/`
- `environment/trees/`
- `environment/rocks/`
- `cover/`
- `landmarks/`
- `decorations/`
- `props/`

The test page intentionally rejects bundled-only registrations, duplicate IDs, empty recipes, incorrect categories, and incorrect `sourceFile` values.
