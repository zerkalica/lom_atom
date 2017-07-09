import babel from 'rollup-plugin-babel';

export default {
	entry: 'src/index.js',

	format: 'umd',
	moduleName: 'lom_atom',

	dest: 'dist/lom_atom.js',
	sourceMap: true,
	plugins: [
		babel({
			exclude: 'node_modules/**'
		})
	]
};
