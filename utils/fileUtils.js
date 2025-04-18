// @/utils/fileUtils.js
export const saveFileToLocal = async (tempFilePath) => {
    try {
        // 获取上传目录
        const uploadDir = '_doc/upload/';
        // 确保上传目录存在
        await createDirIfNotExists(uploadDir);

        // 生成唯一文件名
        const fileName = `${Date.now()}.${tempFilePath.split('.').pop()}`;
        const savePath = `${uploadDir}${fileName}`;

        // 保存文件
        const { savedFilePath } = await uni.saveFile({
            tempFilePath,
            filePath: savePath
        });

        return savedFilePath;
    } catch (error) {
        console.error('保存文件到本地失败:', error);
        throw error;
    }
};

// 确保目录存在
const createDirIfNotExists = async (dirPath) => {
    try {
        await uni.getFileInfo({
            filePath: dirPath
        });
    } catch (error) {
        if (error.errMsg.includes('file not found')) {
            await uni.mkdir({
                dirPath,
                recursive: true
            });
        } else {
            throw error;
        }
    }
};