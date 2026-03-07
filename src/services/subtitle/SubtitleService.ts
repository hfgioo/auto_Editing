export interface Subtitle {
  startTime: number;
  endTime: number;
  text: string;
}

export class SubtitleService {
  /**
   * 生成 SRT 格式字幕文件
   */
  generateSRT(subtitles: Subtitle[]): string {
    return subtitles.map((sub, index) => {
      const start = this.formatTime(sub.startTime);
      const end = this.formatTime(sub.endTime);
      return `${index + 1}\n${start} --> ${end}\n${sub.text}\n`;
    }).join('\n');
  }

  /**
   * 保存字幕文件
   */
  async saveSRT(subtitles: Subtitle[], outputPath: string): Promise<void> {
    const fs = require('fs').promises;
    const content = this.generateSRT(subtitles);
    await fs.writeFile(outputPath, content, 'utf-8');
  }

  /**
   * 格式化时间为 SRT 格式 (HH:MM:SS,mmm)
   */
  private formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
  }

  /**
   * 解析 SRT 文件
   */
  async parseSRT(filePath: string): Promise<Subtitle[]> {
    const fs = require('fs').promises;
    const content = await fs.readFile(filePath, 'utf-8');
    
    const subtitles: Subtitle[] = [];
    const blocks = content.trim().split('\n\n');

    for (const block of blocks) {
      const lines = block.split('\n');
      if (lines.length >= 3) {
        const timeMatch = lines[1].match(/(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/);
        if (timeMatch) {
          subtitles.push({
            startTime: this.parseTime(timeMatch[1]),
            endTime: this.parseTime(timeMatch[2]),
            text: lines.slice(2).join('\n')
          });
        }
      }
    }

    return subtitles;
  }

  /**
   * 解析 SRT 时间格式
   */
  private parseTime(timeStr: string): number {
    const [time, ms] = timeStr.split(',');
    const [hours, minutes, seconds] = time.split(':').map(Number);
    return hours * 3600 + minutes * 60 + seconds + Number(ms) / 1000;
  }
}
