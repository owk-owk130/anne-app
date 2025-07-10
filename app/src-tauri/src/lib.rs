use tauri::Manager;
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use std::path::PathBuf;
use std::io;

#[derive(Debug, Serialize, Deserialize)]
struct Comment {
    id: String,
    text: String,
    timestamp: DateTime<Utc>,
    is_ai: bool,
}

#[derive(Debug, Serialize, Deserialize)]
struct ImageMetadata {
    id: String,
    filename: String,
    original_name: String,
    timestamp: DateTime<Utc>,
    analysis_result: Option<String>,
    user_comments: Vec<Comment>,
}

#[derive(Debug, Serialize, Deserialize)]
struct ImagesData {
    images: Vec<ImageMetadata>,
}

fn get_app_images_dir(app_handle: &tauri::AppHandle) -> Result<PathBuf, io::Error> {
    let app_dir = app_handle.path().app_data_dir().map_err(|_| {
        io::Error::new(io::ErrorKind::NotFound, "Could not find app data directory")
    })?;
    let images_dir = app_dir.join("anne-app").join("images");
    
    if !images_dir.exists() {
        std::fs::create_dir_all(&images_dir)?;
    }
    
    Ok(images_dir)
}

fn get_app_metadata_path(app_handle: &tauri::AppHandle) -> Result<PathBuf, io::Error> {
    let app_dir = app_handle.path().app_data_dir().map_err(|_| {
        io::Error::new(io::ErrorKind::NotFound, "Could not find app data directory")
    })?;
    let anne_app_dir = app_dir.join("anne-app");
    
    if !anne_app_dir.exists() {
        std::fs::create_dir_all(&anne_app_dir)?;
    }
    
    Ok(anne_app_dir.join("metadata.json"))
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn save_network_image(
    app: tauri::AppHandle,
    filename: String,
    image_data: Vec<u8>,
) -> Result<String, String> {
    let images_dir = get_app_images_dir(&app).map_err(|e| e.to_string())?;
    
    // ファイル名のサニタイズ
    if filename.contains("..") || filename.contains("/") || filename.contains("\\") {
        return Err("無効なファイル名です".to_string());
    }
    
    let image_path = images_dir.join(&filename);
    std::fs::write(&image_path, &image_data).map_err(|e| {
        format!("ネットワーク画像保存エラー ({}): {}", image_path.display(), e)
    })?;
    
    Ok(format!("ネットワーク画像保存完了: {}", filename))
}

#[tauri::command]
async fn save_network_image_with_metadata(
    app: tauri::AppHandle,
    filename: String,
    image_data: Vec<u8>,
    image_metadata: String, // ImageMetadataのJSON文字列
) -> Result<String, String> {
    let images_dir = get_app_images_dir(&app).map_err(|e| e.to_string())?;
    let metadata_path = get_app_metadata_path(&app).map_err(|e| e.to_string())?;
    
    // ファイル名のサニタイズ
    if filename.contains("..") || filename.contains("/") || filename.contains("\\") {
        return Err("無効なファイル名です".to_string());
    }
    
    // 画像データを保存
    let image_path = images_dir.join(&filename);
    std::fs::write(&image_path, &image_data).map_err(|e| {
        format!("ネットワーク画像保存エラー ({}): {}", image_path.display(), e)
    })?;
    
    // メタデータを解析
    let new_image: ImageMetadata = serde_json::from_str(&image_metadata)
        .map_err(|e| format!("画像メタデータ解析エラー: {}", e))?;
    
    // 既存のメタデータを読み込み
    let mut images_data = if metadata_path.exists() {
        let metadata_content = std::fs::read_to_string(&metadata_path).map_err(|e| {
            format!("メタデータ読み込みエラー: {}", e)
        })?;
        serde_json::from_str::<ImagesData>(&metadata_content).unwrap_or(ImagesData { images: Vec::new() })
    } else {
        ImagesData { images: Vec::new() }
    };
    
    // 重複チェック（同じIDが既に存在するか）
    if !images_data.images.iter().any(|img| img.id == new_image.id) {
        images_data.images.push(new_image);
        
        // 更新されたメタデータを保存
        let updated_metadata = serde_json::to_string_pretty(&images_data)
            .map_err(|e| format!("メタデータシリアライゼーションエラー: {}", e))?;
        
        std::fs::write(&metadata_path, &updated_metadata).map_err(|e| {
            format!("メタデータ保存エラー ({}): {}", metadata_path.display(), e)
        })?;
    }
    
    Ok(format!("ネットワーク画像+メタデータ保存完了: {}", filename))
}

#[tauri::command]
async fn update_local_metadata(
    app: tauri::AppHandle,
    new_metadata: String,
) -> Result<String, String> {
    let metadata_path = get_app_metadata_path(&app).map_err(|e| e.to_string())?;
    
    // JSON形式の検証
    let parsed_metadata: serde_json::Value = serde_json::from_str(&new_metadata)
        .map_err(|e| format!("無効なJSON形式: {}", e))?;
    
    // ImagesData構造として検証
    let images_data: ImagesData = serde_json::from_value(parsed_metadata)
        .map_err(|e| format!("無効なメタデータ構造: {}", e))?;
    
    // フォーマットして保存
    let formatted_metadata = serde_json::to_string_pretty(&images_data)
        .map_err(|e| format!("JSON整形エラー: {}", e))?;
    
    std::fs::write(&metadata_path, &formatted_metadata).map_err(|e| {
        format!("ローカルメタデータ更新エラー ({}): {}", metadata_path.display(), e)
    })?;
    
    Ok(format!("ローカルメタデータ更新完了: {} 件の画像", images_data.images.len()))
}

#[tauri::command]
async fn save_image(
    app: tauri::AppHandle,
    image_data: Vec<u8>,
    original_name: String,
    analysis_result: Option<String>,
) -> Result<String, String> {
    let images_dir = get_app_images_dir(&app).map_err(|e| e.to_string())?;
    let metadata_path = get_app_metadata_path(&app).map_err(|e| e.to_string())?;
    
    // 画像IDとファイル名を生成
    let timestamp = Utc::now();
    let image_id = format!("img_{}", timestamp.timestamp());
    let extension = original_name.split('.').last().unwrap_or("jpg");
    let filename = format!("{}.{}", image_id, extension);
    
    // 画像ファイルを保存
    let image_path = images_dir.join(&filename);
    std::fs::write(&image_path, &image_data).map_err(|e| {
        format!("画像ファイル保存エラー ({}): {}", image_path.display(), e)
    })?;
    
    // メタデータを更新
    let mut images_data = if metadata_path.exists() {
        let metadata_content = std::fs::read_to_string(&metadata_path).map_err(|e| {
            format!("メタデータ読み込みエラー: {}", e)
        })?;
        serde_json::from_str::<ImagesData>(&metadata_content).unwrap_or(ImagesData { images: Vec::new() })
    } else {
        ImagesData { images: Vec::new() }
    };
    
    let new_image = ImageMetadata {
        id: image_id.clone(),
        filename,
        original_name,
        timestamp,
        analysis_result,
        user_comments: Vec::new(),
    };
    
    images_data.images.push(new_image);
    
    let updated_metadata = serde_json::to_string_pretty(&images_data).map_err(|e| {
        format!("メタデータシリアライゼーションエラー: {}", e)
    })?;
    
    std::fs::write(&metadata_path, &updated_metadata).map_err(|e| {
        format!("メタデータ保存エラー ({}): {}", metadata_path.display(), e)
    })?;
    
    Ok(image_id)
}

#[tauri::command]
async fn get_saved_images(app: tauri::AppHandle) -> Result<Vec<ImageMetadata>, String> {
    let metadata_path = get_app_metadata_path(&app).map_err(|e| e.to_string())?;
    
    if !metadata_path.exists() {
        return Ok(Vec::new());
    }
    
    let metadata_content = std::fs::read_to_string(&metadata_path).map_err(|e| e.to_string())?;
    let images_data: ImagesData = serde_json::from_str(&metadata_content).map_err(|e| e.to_string())?;
    
    Ok(images_data.images)
}

#[tauri::command]
async fn load_image(app: tauri::AppHandle, image_id: String) -> Result<Vec<u8>, String> {
    let images_dir = get_app_images_dir(&app).map_err(|e| e.to_string())?;
    let metadata_path = get_app_metadata_path(&app).map_err(|e| e.to_string())?;
    
    if !metadata_path.exists() {
        return Err("No saved images found".to_string());
    }
    
    let metadata_content = std::fs::read_to_string(&metadata_path).map_err(|e| e.to_string())?;
    let images_data: ImagesData = serde_json::from_str(&metadata_content).map_err(|e| e.to_string())?;
    
    let image_meta = images_data.images.iter()
        .find(|img| img.id == image_id)
        .ok_or("Image not found")?;
    
    let image_path = images_dir.join(&image_meta.filename);
    let image_data = std::fs::read(&image_path).map_err(|e| e.to_string())?;
    
    Ok(image_data)
}

#[tauri::command]
async fn update_image_comments(
    app: tauri::AppHandle,
    image_id: String,
    comments: Vec<Comment>,
) -> Result<(), String> {
    let metadata_path = get_app_metadata_path(&app).map_err(|e| e.to_string())?;
    
    if !metadata_path.exists() {
        return Err("No saved images found".to_string());
    }
    
    let metadata_content = std::fs::read_to_string(&metadata_path).map_err(|e| e.to_string())?;
    let mut images_data: ImagesData = serde_json::from_str(&metadata_content).map_err(|e| e.to_string())?;
    
    if let Some(image_meta) = images_data.images.iter_mut().find(|img| img.id == image_id) {
        image_meta.user_comments = comments;
        
        let updated_metadata = serde_json::to_string_pretty(&images_data).map_err(|e| e.to_string())?;
        std::fs::write(&metadata_path, updated_metadata).map_err(|e| e.to_string())?;
        
        Ok(())
    } else {
        Err("Image not found".to_string())
    }
}

#[tauri::command]
async fn delete_post(app: tauri::AppHandle, post_id: String) -> Result<(), String> {
    let images_dir = get_app_images_dir(&app).map_err(|e| e.to_string())?;
    let metadata_path = get_app_metadata_path(&app).map_err(|e| e.to_string())?;

    if !metadata_path.exists() {
        return Err("メタデータファイルが見つかりません".to_string());
    }

    // メタデータを読み込み
    let metadata_content = std::fs::read_to_string(&metadata_path).map_err(|e| e.to_string())?;
    let mut images_data: ImagesData = serde_json::from_str(&metadata_content).map_err(|e| e.to_string())?;

    // 削除対象の投稿を検索
    let post_index = images_data.images.iter().position(|img| img.id == post_id);
    
    if let Some(index) = post_index {
        let post = &images_data.images[index];
        
        // 画像ファイルを削除
        let image_path = images_dir.join(&post.filename);
        if image_path.exists() {
            std::fs::remove_file(&image_path).map_err(|e| format!("画像ファイル削除エラー: {}", e))?;
        }
        
        // メタデータから投稿を削除
        images_data.images.remove(index);
        
        // 更新されたメタデータを保存
        let updated_metadata = serde_json::to_string_pretty(&images_data).map_err(|e| e.to_string())?;
        std::fs::write(&metadata_path, updated_metadata).map_err(|e| e.to_string())?;
        
        Ok(())
    } else {
        Err("指定された投稿が見つかりません".to_string())
    }
}

#[tauri::command]
async fn delete_comment(
    app: tauri::AppHandle,
    post_id: String,
    comment_id: String,
) -> Result<(), String> {
    let metadata_path = get_app_metadata_path(&app).map_err(|e| e.to_string())?;

    if !metadata_path.exists() {
        return Err("メタデータファイルが見つかりません".to_string());
    }

    let metadata_content = std::fs::read_to_string(&metadata_path).map_err(|e| e.to_string())?;
    let mut images_data: ImagesData = serde_json::from_str(&metadata_content).map_err(|e| e.to_string())?;

    // 投稿を検索
    if let Some(post) = images_data.images.iter_mut().find(|img| img.id == post_id) {
        // コメントを削除（AI分析結果は削除不可）
        let original_len = post.user_comments.len();
        post.user_comments.retain(|comment| comment.id != comment_id);
        
        if post.user_comments.len() == original_len {
            return Err("指定されたコメントが見つかりません".to_string());
        }
        
        // 更新されたメタデータを保存
        let updated_metadata = serde_json::to_string_pretty(&images_data).map_err(|e| e.to_string())?;
        std::fs::write(&metadata_path, updated_metadata).map_err(|e| e.to_string())?;
        
        Ok(())
    } else {
        Err("指定された投稿が見つかりません".to_string())
    }
}

#[tauri::command]
async fn update_image_analysis(
    app: tauri::AppHandle,
    image_id: String,
    analysis_result: String,
) -> Result<(), String> {
    let metadata_path = get_app_metadata_path(&app).map_err(|e| e.to_string())?;

    if !metadata_path.exists() {
        return Err("メタデータファイルが見つかりません".to_string());
    }

    let metadata_content = std::fs::read_to_string(&metadata_path).map_err(|e| e.to_string())?;
    let mut images_data: ImagesData = serde_json::from_str(&metadata_content).map_err(|e| e.to_string())?;

    // 画像を検索してAI分析結果を更新
    if let Some(image) = images_data.images.iter_mut().find(|img| img.id == image_id) {
        image.analysis_result = Some(analysis_result);
        
        // 更新されたメタデータを保存
        let updated_metadata = serde_json::to_string_pretty(&images_data).map_err(|e| e.to_string())?;
        std::fs::write(&metadata_path, updated_metadata).map_err(|e| e.to_string())?;
        
        Ok(())
    } else {
        Err("指定された画像が見つかりません".to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            // アプリ起動時にディレクトリを初期化
            let app_handle = app.handle().clone();
            if let Err(e) = get_app_images_dir(&app_handle) {
                eprintln!("Failed to initialize images directory: {}", e);
            }
            if let Err(e) = get_app_metadata_path(&app_handle) {
                eprintln!("Failed to initialize metadata path: {}", e);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            save_image,
            save_network_image,
            save_network_image_with_metadata,
            update_local_metadata,
            get_saved_images,
            load_image,
            update_image_comments,
            delete_post,
            delete_comment,
            update_image_analysis
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
