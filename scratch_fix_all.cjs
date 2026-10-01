const { Project, SyntaxKind } = require("ts-morph");

const project = new Project({ tsConfigFilePath: "tsconfig.json" });

const sourceFiles = project.getSourceFiles("src/**/*.{ts,tsx}");

sourceFiles.forEach(sourceFile => {
    let modified = false;

    // 1. Add 'any' to all parameters without types
    const functionLikes = [
        ...sourceFile.getFunctions(),
        ...sourceFile.getClasses().flatMap(c => c.getMethods()),
        ...sourceFile.getClasses().flatMap(c => c.getConstructors()),
        ...sourceFile.getVariableDeclarations()
            .map(v => v.getInitializerIfKind(SyntaxKind.ArrowFunction))
            .filter(f => f),
        ...sourceFile.getDescendantsOfKind(SyntaxKind.ArrowFunction),
        ...sourceFile.getDescendantsOfKind(SyntaxKind.FunctionExpression)
    ];

    functionLikes.forEach(func => {
        func.getParameters().forEach(param => {
            if (!param.getTypeNode() && !param.isRestParameter()) {
                // If it's inside a .tsx file and it's an event handler like `e => ...`, `e: any` is needed
                param.setType("any");
                modified = true;
            }
        });
    });

    // 2. Fix catch clauses to use `any` instead of `unknown`
    const catchClauses = sourceFile.getDescendantsOfKind(SyntaxKind.CatchClause);
    catchClauses.forEach(catchClause => {
        const variable = catchClause.getVariableDeclaration();
        if (variable && !variable.getTypeNode()) {
            variable.setType("any");
            modified = true;
        }
    });

    // 3. Hack for `withTimeout(promise: Promise<any>...)` -> `withTimeout(promise: any...)`
    const withTimeouts = sourceFile.getFunctions().filter(f => f.getName() === "withTimeout");
    withTimeouts.forEach(f => {
        const promiseParam = f.getParameter("promise");
        if (promiseParam) {
            promiseParam.setType("any");
            modified = true;
        }
    });

    // 4. Variables initialized with empty arrays need a type to avoid `never[]`
    const varDecls = sourceFile.getVariableDeclarations();
    varDecls.forEach(decl => {
        const initializer = decl.getInitializer();
        if (initializer && initializer.getKind() === SyntaxKind.ArrayLiteralExpression) {
            const arrayLit = initializer;
            if (arrayLit.getElements().length === 0 && !decl.getTypeNode()) {
                decl.setType("any[]");
                modified = true;
            }
        }
    });

    if (modified) {
        sourceFile.saveSync();
        console.log("Fixed parameters & catch in:", sourceFile.getFilePath());
    }
});

console.log("Done fixing all files!");
