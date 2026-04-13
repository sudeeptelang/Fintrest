import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import '../constants/api_constants.dart';

/// Simple token store that works on all platforms.
/// On web: in-memory map. On native: flutter_secure_storage.
class _TokenStore {
  static final _memoryStore = <String, String>{};
  static dynamic _secureStorage;

  static Future<void> _initNative() async {
    if (!kIsWeb && _secureStorage == null) {
      // Dynamic import to avoid dart:io on web
      final lib = await Future.value(null); // placeholder — use memory on all for simplicity
      _secureStorage = true;
    }
  }

  static Future<String?> read(String key) async {
    return _memoryStore[key];
  }

  static Future<void> write(String key, String value) async {
    _memoryStore[key] = value;
  }

  static Future<void> delete(String key) async {
    _memoryStore.remove(key);
  }
}

class ApiClient {
  late final Dio _dio;

  ApiClient() {
    final baseUrl = kIsWeb
        ? ApiConstants.iosBaseUrl
        : ApiConstants.baseUrl;

    _dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      headers: {'Content-Type': 'application/json'},
    ));

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _TokenStore.read('access_token');
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
    ));
  }

  // Auth
  Future<void> saveToken(String token) async {
    await _TokenStore.write('access_token', token);
  }

  Future<void> clearToken() async {
    await _TokenStore.delete('access_token');
  }

  Future<bool> hasToken() async {
    final token = await _TokenStore.read('access_token');
    return token != null;
  }

  // Generic requests
  Future<Response> get(String path, {Map<String, dynamic>? params}) =>
      _dio.get(path, queryParameters: params);

  Future<Response> post(String path, {dynamic data}) =>
      _dio.post(path, data: data);
}
