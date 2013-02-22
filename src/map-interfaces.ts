
///<reference path='../quby.ts' />

/**
 * TypeScript cannot do generics (yet),
 * and has issues with using Object literals
 * as a map.
 * 
 * So this is a big long list of Object-literal
 * maps for mapping 'string -> <some type>'.
 */

/* General Purpose maps */

interface BoolMap {
    [callName: string]: bool;
}

interface StringMap {
    [callName: string]: string;
}

/* quby.ast maps */

interface IFunctionDeclarationMap {
    [callName: string]: quby.ast.IFunctionMeta;
}

interface FunctionCallArrayMap {
    [callName: string]: quby.ast.FunctionCall[];
}

interface FunctionCallArrayMapMap {
    [callName: string]: FunctionCallArrayMap;
}

interface VariableMap {
    [callName: string]: quby.ast.LocalVariable;
}

interface FieldVariableMap {
    [callName: string]: quby.ast.FieldVariable;
}

interface GlobalVariableMap {
    [callName: string]: quby.ast.GlobalVariable;
}

/* quby.core maps */

interface ClassValidatorMap {
    [callName: string]: quby.core.ClassValidator;
}
