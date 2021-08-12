import { guide, output } from '../../messages';
import path from 'path';
import { promises as fsPromises } from 'fs';
import execa from 'execa';
import { getInstallCmd } from '../../helpers';

const createDirs = async (
  projectRoot: string,
  srcDir: string,
  publishDir: string
) => {
  await fsPromises.mkdir(projectRoot, { recursive: true });
  await fsPromises.mkdir(path.join(projectRoot, srcDir), { recursive: true });
  await fsPromises.mkdir(path.join(projectRoot, publishDir), {
    recursive: true,
  });
};

const createClaspApp = async (
  projectRoot: string,
  publishDir: string,
  projectName: string
) => {
  output.info(`create ${projectName} with gaskunk...`, '🏠');
  process.chdir(projectRoot);

  await execa('npx', ['clasp', 'create', '--type', 'sheet']);

  const appsScriptJson = await fsPromises.readFile(
    path.join(projectRoot, 'appsscript.json')
  );
  await fsPromises.writeFile(
    path.join(projectRoot, `${publishDir}/appsscript.json`),
    appsScriptJson
  );
  await fsPromises.unlink(path.join(projectRoot, 'appsscript.json'));

  const claspJsonFile = await fsPromises.readFile(
    path.join(projectRoot, '.clasp.json')
  );
  const claspJson = JSON.parse(claspJsonFile.toString());
  const newClaspJson = {
    ...claspJson,
    rootDir: `./${publishDir}`,
  };
  await fsPromises.writeFile(
    path.join(projectRoot, '.clasp.json'),
    JSON.stringify(newClaspJson)
  );

  output.success(`created ${projectName}`);
};

const initialize = async (projectRoot: string) => {
  output.info('install dependencies...', '🔧');
  process.chdir(projectRoot);
  const installCmd = getInstallCmd();

  await execa(installCmd, ['init', '-y']);
  const packageJsonStr = await (
    await fsPromises.readFile(path.join(projectRoot, 'package.json'))
  ).toString();
  output.info('initializing...');
  const packageJson = JSON.parse(packageJsonStr);
  const scripts = {
    build: 'webpack',
    deploy: 'clasp push',
    open: 'clasp open',
    typecheck: 'tsc --noEmit',
  };
  const newPackageJson = {
    ...packageJson,
    scripts,
  };
  await fsPromises.writeFile(
    path.join(projectRoot, 'package.json'),
    JSON.stringify(newPackageJson, undefined, 2)
  );
  output.success('initialized');

  output.info('install dependencies...', '🔧');
  const deps = [
    '@babel/core',
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-proposal-nullish-coalescing-operator',
    '@babel/plugin-proposal-object-rest-spread',
    '@babel/plugin-proposal-optional-chaining',
    '@babel/preset-env',
    '@babel/preset-typescript',
    '@gaskunk/core',
    '@google/clasp',
    '@types/google-apps-script',
    'babel-loader',
    'gas-webpack-plugin',
    'typescript',
    'webpack',
    'webpack-cli',
  ];

  const useYarn = installCmd === 'yarn';
  const installDepsCmd = useYarn ? 'add' : 'install';
  await execa(installCmd, [installDepsCmd, 'install', '-D', ...deps]);
  output.success('installed dependencies');
};

const createConfigFiles = async (
  projectRoot: string,
  srcDir: string,
  publishDir: string
) => {
  output.info('create config files...');
  const gitignore = `### https://raw.github.com/github/gitignore/85bf08b19a77c62d7b6286c2db8811f2ff373b0f/Node.gitignore

# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*

# Diagnostic reports (https://nodejs.org/api/report.html)
report.[0-9]*.[0-9]*.[0-9]*.[0-9]*.json

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Directory for instrumented libs generated by jscoverage/JSCover
lib-cov

# Coverage directory used by tools like istanbul
coverage
*.lcov

# nyc test coverage
.nyc_output

# Grunt intermediate storage (https://gruntjs.com/creating-plugins#storing-task-files)
.grunt

# Bower dependency directory (https://bower.io/)
bower_components

# node-waf configuration
.lock-wscript

# Compiled binary addons (https://nodejs.org/api/addons.html)
build/Release

# Dependency directories
node_modules/
jspm_packages/

# TypeScript v1 declaration files
typings/

# TypeScript cache
*.tsbuildinfo

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env
.env.test

# parcel-bundler cache (https://parceljs.org/)
.cache

# next.js build output
.next

# nuxt.js build output
.nuxt

# vuepress build output
.vuepress/dist

# Serverless directories
.serverless/

# FuseBox cache
.fusebox/

# DynamoDB Local files
.dynamodb/

# For gaskunk
.clasp.json
`;

  const babelConfig = `module.exports = (api) => {
  api.cache(true);

  const presets = ['@babel/preset-env', '@babel/preset-typescript'];

  const plugins = [
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-proposal-object-rest-spread',
    '@babel/plugin-proposal-nullish-coalescing-operator',
    '@babel/plugin-proposal-optional-chaining',
  ];

  return { presets, plugins };
};
`;

  const tsconfigJson = {
    compilerOptions: {
      module: 'commonjs',
      target: 'ES5',
      lib: ['dom', 'esnext', 'dom.iterable'],
      declaration: true,
      sourceMap: true,
      strict: true,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
    },
  };

  const webpackConfig = `const path = require('path');
const GasPlugin = require('gas-webpack-plugin');

const SRC_PATH = path.resolve(__dirname, './${srcDir}');
const DIST_PATH = path.resolve(__dirname, './${publishDir}');

module.exports = {
  mode: 'production',
  entry: {
    index: SRC_PATH + '/index.ts',
  },
  output: {
    path: DIST_PATH,
    filename: 'index.js',
  },
  module: {
    rules: [
      {
        test: /\.[tj]s$/,
        exclude: '/node_modules/',
        loader: 'babel-loader',
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  optimization: {
    minimizer: [
      (compiler) => {
        const TerserPlugin = require('terser-webpack-plugin');
        new TerserPlugin({
          extractComments: false,
          terserOptions: {
            keep_classnames: true,
          },
        }).apply(compiler);
      },
    ],
  },
  plugins: [new GasPlugin()],
};
`;

  await fsPromises.writeFile(
    path.resolve(projectRoot, '.gitignore'),
    gitignore
  );
  await fsPromises.writeFile(
    path.resolve(projectRoot, 'babel.config.js'),
    babelConfig
  );
  await fsPromises.writeFile(
    path.resolve(projectRoot, 'tsconfig.json'),
    JSON.stringify(tsconfigJson, undefined, 2)
  );
  await fsPromises.writeFile(
    path.resolve(projectRoot, 'webpack.config.js'),
    webpackConfig
  );

  output.success('created config files');
};

export const init = async (
  projectName: string,
  srcDir: string,
  publishDir: string
) => {
  const projectRoot = path.resolve(projectName);
  const installCmd = getInstallCmd();

  await createDirs(projectRoot, srcDir, publishDir);
  await createClaspApp(projectRoot, publishDir, projectName);
  await initialize(projectRoot);
  await createConfigFiles(projectRoot, srcDir, publishDir);

  guide(installCmd, projectName);
};
