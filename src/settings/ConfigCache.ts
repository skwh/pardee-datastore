import fs from 'fs'
import path from 'path'

import { ApplicationConfig } from '../models/ApplicationData'
import { Either, Left, Right } from '../lib/Either'

export class ConfigCache {

  static CONFIG_FILENAME = `datastore-config.json`
  fullPath: string

  constructor(private cachePath: string) {
    this.fullPath = path.join(cachePath, ConfigCache.CONFIG_FILENAME)
  }

  checkCacheFileExists(): boolean {
    return fs.existsSync(this.fullPath)
  }

  checkCacheFolderExists(): boolean {
    return fs.existsSync(this.cachePath)
  }

  saveApplicationConfigToCache(config: ApplicationConfig): void {
    if (!this.checkCacheFolderExists()) {
      fs.mkdirSync(this.cachePath)
    }

    const str = JSON.stringify(config)
    fs.writeFileSync(this.fullPath, str)
  }

  loadApplicationConfigFromCache(): Either<Error, ApplicationConfig> {
    if (!fs.existsSync(this.fullPath)) {
      return Left(new Error(`Cannot load application config: config file does not exist.`))
    }
    const str = fs.readFileSync(this.fullPath).toString()
    return Right(JSON.parse(str) as ApplicationConfig)
  }

  clearApplicationConfigCache(): void {
    try {
      fs.unlinkSync(this.fullPath)
    } catch (error) {
      // do nothing
    }
  }
}