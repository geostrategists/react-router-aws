import type { BuildOptions } from 'esbuild'
import type { Config, Preset } from '@react-router/dev/dist/config'

import * as esbuild from 'esbuild'
import {
  cpSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'fs'
import { join } from 'path'

import { AWSProxy } from './index'

// Resolved config passed to BuildEndHook, the type is not exported anymore in react-router
type ResolvedReactRouterConfig = Parameters<NonNullable<Config['buildEnd']>>[0]['reactRouterConfig']

type AwsReactRouterConfig = {
  awsProxy?: AWSProxy,
  build?: BuildOptions
}

const defaultConfig: AwsReactRouterConfig = {
  awsProxy: AWSProxy.APIGatewayV2,
  build: {
    logLevel: 'info',
    entryPoints: [
      'build/server.js'
    ],
    bundle: true,
    sourcemap: false,
    platform: 'node',
    outfile: 'build/server/index.js', // will replace react router server build file
    allowOverwrite: true,
    write: true,
  }
}

const copyDefaultServerHandler = (
  reactRouterUserConfig: ResolvedReactRouterConfig,
  config: AwsReactRouterConfig
) => {
  const buildDirectory = reactRouterUserConfig.buildDirectory ?? 'build'
  const templateServerFile = join(__dirname, 'server.js')
  const destinationServerFile = join(buildDirectory, 'server.js')

  console.log('📋 Copying generic handler to:', buildDirectory)

  cpSync(templateServerFile, destinationServerFile)

  if (config.awsProxy) {
    let serverFileWithConfig = readFileSync(destinationServerFile, 'utf-8')

    serverFileWithConfig = serverFileWithConfig
      .replace(
        /awsProxy: .+/,
        `awsProxy: '${config.awsProxy}'`
      )
      .replace(
        './build/server/index.js',
        reactRouterUserConfig.buildDirectory + '/server/' + reactRouterUserConfig.serverBuildFile
      )

    writeFileSync(destinationServerFile, serverFileWithConfig, 'utf8')
  }
}

const cleanupHandler = (reactRouterUserConfig: ResolvedReactRouterConfig) => {
  rmSync(
    join(reactRouterUserConfig.buildDirectory ?? 'build', 'server.js')
  )
}

const buildEndHandler: (config: AwsReactRouterConfig) => Config['buildEnd'] =
  (config) =>
    async (
      {
        reactRouterConfig,
        viteConfig
      }
    ) => {
      console.log('👷 Building for AWS...')

      const isEsm = [reactRouterConfig.serverModuleFormat, config.build?.format].includes('esm')

      const mergedConfig = {
        ...defaultConfig,
        ...config,
        build: {
          ...defaultConfig.build,
          format: reactRouterConfig.serverModuleFormat,
          outfile: reactRouterConfig.buildDirectory + '/server/' + reactRouterConfig.serverBuildFile,
          publicPath: viteConfig.base,
          minify: Boolean(viteConfig.build.minify),
          sourcemap: viteConfig.build.sourcemap,
          target: viteConfig.build.target,

          // workaround dynamic require bug
          // https://github.com/evanw/esbuild/issues/1921#issuecomment-2302290651
          mainFields: isEsm
            ? ['module', 'main']
            : undefined,
          banner: isEsm
            ? {
              js: 'import { createRequire } from \'module\'; const require = createRequire(import.meta.url);',
            }
            : undefined,

          ...config.build
        } as BuildOptions
      }

      const { build } = mergedConfig

      if (!config?.build?.entryPoints) {
        copyDefaultServerHandler(reactRouterConfig, mergedConfig)
      }

      try {
        await esbuild.build(build as BuildOptions)

        console.log('✅ Build for AWS successful!')
      } catch (error) {
        console.error('🚫 Build for AWS failed:', error)

        process.exit(1)
      } finally {
        if (!config?.build?.entryPoints) {
          console.log('🧹 Cleaning up...')

          cleanupHandler(reactRouterConfig)

          console.log('🧹 Clean up completed!')
        }
      }
    }

export function awsPreset(config: AwsReactRouterConfig = {}): Preset {
  return {
    name: 'aws-preset',
    reactRouterConfig: () => ({
      buildEnd: buildEndHandler(config),
    }),
  }
}
