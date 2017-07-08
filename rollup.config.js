import babel from 'rollup-plugin-babel';

export default {
	entry: 'src/index.js',

	format: 'umd',
	moduleName: 'lom-atom',

	dest: 'dist/lom-atom.js',

	plugins: [
		babel({
			exclude: 'node_modules/**'
		})
	]
};
