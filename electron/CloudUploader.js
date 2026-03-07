const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const OSS = require('ali-oss');
const COS = require('cos-nodejs-sdk-v5');

class CloudUploader {
  constructor() {
    this.ossClient = null;
    this.cosClient = null;
  }

  // 初始化阿里云 OSS
  initOSS(config) {
    this.ossClient = new OSS({
      region: config.region,
      accessKeyId: config.accessKeyId,
      accessKeySecret: config.accessKeySecret,
      bucket: config.bucket,
    });
  }

  // 初始化腾讯云 COS
  initCOS(config) {
    this.cosClient = new COS({
      SecretId: config.secretId,
      SecretKey: config.secretKey,
    });
    this.cosBucket = config.bucket;
    this.cosRegion = config.region;
  }

  // 上传到阿里云 OSS
  async uploadToOSS(filePath, objectName, onProgress) {
    if (!this.ossClient) {
      throw new Error('OSS 未初始化，请先配置阿里云参数');
    }

    try {
      const result = await this.ossClient.put(objectName, filePath, {
        progress: (p) => {
          if (onProgress) {
            onProgress(Math.round(p * 100));
          }
        },
      });

      return {
        url: result.url,
        name: result.name,
        provider: 'oss',
      };
    } catch (error) {
      console.error('[CloudUploader] OSS 上传失败:', error);
      throw new Error(`OSS 上传失败: ${error.message}`);
    }
  }

  // 上传到腾讯云 COS
  async uploadToCOS(filePath, objectName, onProgress) {
    if (!this.cosClient) {
      throw new Error('COS 未初始化，请先配置腾讯云参数');
    }

    return new Promise((resolve, reject) => {
      this.cosClient.uploadFile({
        Bucket: this.cosBucket,
        Region: this.cosRegion,
        Key: objectName,
        FilePath: filePath,
        onProgress: (progressData) => {
          if (onProgress) {
            onProgress(Math.round(progressData.percent * 100));
          }
        },
      }, (err, data) => {
        if (err) {
          console.error('[CloudUploader] COS 上传失败:', err);
          reject(new Error(`COS 上传失败: ${err.message}`));
        } else {
          resolve({
            url: `https://${data.Location}`,
            name: objectName,
            provider: 'cos',
          });
        }
      });
    });
  }

  // 统一上传接口
  async upload(filePath, provider, config, onProgress) {
    const fileName = path.basename(filePath);
    const objectName = `auto-editing/${Date.now()}_${fileName}`;

    if (provider === 'oss') {
      this.initOSS(config);
      return await this.uploadToOSS(filePath, objectName, onProgress);
    } else if (provider === 'cos') {
      this.initCOS(config);
      return await this.uploadToCOS(filePath, objectName, onProgress);
    } else {
      throw new Error(`不支持的云服务提供商: ${provider}`);
    }
  }

  // 批量上传
  async uploadMultiple(filePaths, provider, config, onProgress) {
    const results = [];
    const total = filePaths.length;

    for (let i = 0; i < filePaths.length; i++) {
      const filePath = filePaths[i];
      
      try {
        const result = await this.upload(filePath, provider, config, (progress) => {
          const overallProgress = Math.round(((i + progress / 100) / total) * 100);
          if (onProgress) {
            onProgress(overallProgress, i + 1, total);
          }
        });
        
        results.push({ success: true, ...result });
      } catch (error) {
        results.push({ 
          success: false, 
          filePath, 
          error: error.message 
        });
      }
    }

    return results;
  }
}

module.exports = CloudUploader;
