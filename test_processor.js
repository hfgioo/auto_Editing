const VideoProcessor = require('./electron/VideoProcessor');
const path = require('path');

// 测试配置
const testSettings = {
  aiProvider: 'custom',
  customApiKey: 'your-api-key-here',
  customBaseURL: 'https://your-api-endpoint.com/v1',
  customModelId: 'gpt-4-vision-preview',
  outputPath: path.join(__dirname, 'test_output'),
  videoQuality: 'high',
  autoSubtitle: true,
  autoMusic: false,
};

// 测试视频路径（请替换为实际视频路径）
const testVideoPath = process.argv[2] || '/path/to/test/video.mp4';

async function testVideoProcessing() {
  console.log('🧪 开始测试视频处理功能...\n');
  
  const processor = new VideoProcessor();
  
  try {
    console.log('📹 测试视频:', testVideoPath);
    console.log('⚙️  配置:', JSON.stringify(testSettings, null, 2));
    console.log('\n开始处理...\n');
    
    const task = await processor.processVideo(
      testVideoPath,
      testSettings,
      (updatedTask) => {
        // 打印进度
        console.log(`\n进度: ${updatedTask.progress}%`);
        console.log('步骤状态:');
        Object.entries(updatedTask.steps).forEach(([name, step]) => {
          const icon = step.status === 'completed' ? '✅' :
                      step.status === 'processing' ? '⏳' :
                      step.status === 'failed' ? '❌' :
                      step.status === 'skipped' ? '⏭️' : '⏸️';
          console.log(`  ${icon} ${name}: ${step.status} (${step.progress}%)`);
        });
      }
    );
    
    console.log('\n\n✅ 处理完成！');
    console.log('\n结果:');
    console.log('  输出文件:', task.result.outputPath);
    console.log('  精彩片段数:', task.result.analysis.highlights.length);
    console.log('  字幕条数:', task.result.subtitles?.length || 0);
    
    if (task.result.analysis.highlights.length > 0) {
      console.log('\n精彩片段:');
      task.result.analysis.highlights.forEach((h, i) => {
        console.log(`  ${i + 1}. ${h.startTime}s - ${h.endTime}s: ${h.reason} (评分: ${h.score})`);
      });
    }
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error('\n错误详情:', error);
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  testVideoProcessing();
}

module.exports = { testVideoProcessing };
