const babelParser = require("@babel/parser");
const t = require("@babel/types");
const traverse = require("@babel/traverse").default;
const {
  getRelativePath,
  containsServerActions,
  isClientComponent,
  isReactElement,
  isServerAction,
  wrap,
} = require("./utils");

const generate = require("@babel/generator").default;

module.exports = function (source) {
  // ignore client components as they are handled by BugpilotErrorPage
  if (isClientComponent(source)) {
    return source;
  }

  const options = this.getOptions();

  // checks if there are any Server Actions in the file
  const hasServerActions = containsServerActions(source);
  // set of bugpilot functions that we need to import
  const imports = new Set();
  const filePath = getRelativePath(this.resourcePath);
  const buildContext = {
    buildId: options?.buildId,
    dev: String(options?.dev),
    nextRuntime: options?.nextRuntime,
    filePath,
    kind: options?.kind,
  };

  const ast = babelParser.parse(source, {
    sourceType: "module",
    plugins: ["typescript", "jsx"],
  });

  traverse(ast, {
    enter(path) {
      if (
        buildContext?.kind === "page-component" &&
        isReactElement(path) &&
        path.parentPath.isExportDefaultDeclaration()
      ) {
        imports.add("wrapPageComponent");
        wrap(path, "wrapPageComponent", buildContext);
        path.skip();
      } else if (
        buildContext?.kind === "server-component" &&
        isReactElement(path)
      ) {
        imports.add("wrapServerComponent");
        wrap(path, "wrapServerComponent", buildContext);
        path.skip();
      } else if (
        buildContext?.kind === "server-action" &&
        hasServerActions &&
        isServerAction(path)
      ) {
        // TO IMPROVE: createActionProxy("c538c6d28b8b44073f15e022c4a964393ada4eeb", null, inlineServerActionC, $$ACTION_2);
        imports.add("wrapServerAction");
        wrap(path, "wrapServerAction", buildContext);
        path.skip();
      }
    },
  });

  if (imports.size > 0) {
    const bugpilotImports = t.importDeclaration(
      [...imports].map((im) =>
        t.importSpecifier(t.identifier(im), t.identifier(im))
      ),
      t.stringLiteral("@kicoo7/next-v2")
    );
    ast.program.body.unshift(bugpilotImports);
  }

  const output = generate(ast);
  console.log("output: \n", output.code);
  return output.code;
};
