from flask import Flask, jsonify, request, session
import mysql.connector
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from flask_cors import CORS
import datetime
import re


app = Flask(__name__)
app.secret_key = '123456'  # 设置 Session 密钥
CORS(app, supports_credentials=True)  # 允许跨域携带 Cookie

# 数据库配置
db_config = {
    'host': 'localhost',
    'user': 'root',
    'password': '123456',
    'database': 'car-sharing'
}

def get_db_connection():
    try:
        conn = mysql.connector.connect(**db_config)
        return conn
    except mysql.connector.Error as err:
        print(f"数据库连接错误: {err}")
        return None

# 登录检查装饰器
def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'code': 401, 'message': '未登录，请先登录！'}), 401
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'code': 500, 'message': '数据库连接失败'}), 500
        
        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT * FROM user WHERE user_id = %s", (session['user_id'],))
            current_user = cursor.fetchone()
            cursor.close()
            conn.close()

            if not current_user:
                return jsonify({'code': 401, 'message': '用户不存在或已注销'}), 401
        except Exception as e:
            print(f"数据库查询错误: {e}")
            if 'cursor' in locals():
                cursor.close()
            if conn:
                conn.close()
            return jsonify({'code': 500, 'message': '服务器错误'}), 500
        
        return f(current_user, *args, **kwargs)
    return decorated

def validate_identity_id(identity_id):
    """
    验证身份证号码是否符合格式
    :param identity_id: 身份证号码
    :return: bool
    """
    # 身份证号码必须是18位
    if len(identity_id) != 18:
        return False

    # 前17位必须是数字，第18位可以是数字或大写字母X
    if not re.match(r'^\d{17}[\dX]$', identity_id):
        return False

    # 校验码计算（简化版，不完整）
    # 这里只检查格式，不进行完整的校验码计算
    return True

def calculate_age(identity_id):
    """
    根据身份证号码计算年龄
    :param identity_id: 身份证号码
    :return: 年龄
    """
    if len(identity_id) != 18:
        return None  # 身份证号码格式错误

    try:
        birth_year = int(identity_id[6:10])  # 提取出生年份
        current_year = datetime.datetime.now().year
        age = current_year - birth_year
        return age
    except ValueError:
        return None  # 身份证号码中的出生日期无效

@app.route('/api/calculate_age', methods=['POST'])
def calculate_user_age():
    data = request.json
    identity_id = data.get('identity_id')

    if not identity_id:
        return jsonify({'code': 400, 'message': '身份证号码不能为空'}), 400

    # 校验身份证号码格式
    if not re.match(r'^\d{17}[\dX]$', identity_id):
        return jsonify({'code': 400, 'message': '身份证号码格式不正确'}), 400

    # 计算年龄
    age = calculate_age(identity_id)
    if age is None:
        return jsonify({'code': 400, 'message': '无法计算年龄，身份证号码可能无效'}), 400

    return jsonify({'code': 200, 'message': '年龄计算成功', 'age': age}), 200

# 登录接口（改用 Session）
@app.route('/api/login', methods=['POST'])
def login():
    auth = request.json
    if not auth or not auth.get('username') or not auth.get('password'):
        return jsonify({'code': 400, 'message': '用户名和密码不能为空'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'code': 500, 'message': '数据库连接失败'}), 500

    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM user WHERE username = %s", (auth['username'],))
        user = cursor.fetchone()
        
        if not user:
            cursor.close()
            conn.close()
            return jsonify({'code': 404, 'message': '用户不存在'}), 404

        if check_password_hash(user['password'], auth['password']):
            # 登录成功，设置 Session
            session['user_id'] = user['user_id']
            session.permanent = True  # 持久化 Session（默认 31 天）

            # 更新最后活跃时间
            cursor.execute(
                "UPDATE user SET last_active = %s, status = '在线' WHERE user_id = %s",
                (datetime.datetime.now(), user['user_id'])
            )
            conn.commit()

            cursor.close()
            conn.close()

            return jsonify({
                'code': 200,
                'message': '登录成功',
                'user': {
                    'user_id': user['user_id'],
                    'username': user['username'],
                    'realname': user['realname'],
                    'telephone': user['telephone'],
                    'status': '在线'
                }
            }), 200
        else:
            cursor.close()
            conn.close()
            return jsonify({'code': 401, 'message': '密码错误'}), 401

    except mysql.connector.Error as err:
        print(f"数据库错误: {err}")
        if 'cursor' in locals():
            cursor.close()
        if conn:
            conn.close()
        return jsonify({'code': 500, 'message': '数据库错误'}), 500
    except Exception as e:
        print(f"登录错误: {e}")
        if 'cursor' in locals():
            cursor.close()
        if conn:
            conn.close()
        return jsonify({'code': 500, 'message': '服务器错误'}), 500

# 获取当前用户信息（改用 Session）
@app.route('/api/current_user', methods=['GET'])
@login_required
def get_current_user(current_user):
    return jsonify({
        'code': 200,
        'user': {
            'user_id': current_user['user_id'],
            'username': current_user['username'],
            'realname': current_user['realname'],
            'telephone': current_user['telephone'],
            'status': current_user['status']
        }
    }), 200

# 登出接口
@app.route('/api/logout', methods=['POST'])
@login_required
def logout(current_user):
    session.pop('user_id', None)  # 清除 Session
    return jsonify({'code': 200, 'message': '登出成功'}), 200

# 注册接口
@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    if not data or not all([data.get('username'), data.get('realname'), data.get('identity_id'), data.get('gender'),
                            data.get('telephone'), data.get('password')]):
        return jsonify({'code': 400, 'message': '请填写所有必填项'}), 400

    # 校验身份证号码格式
    if not validate_identity_id(data['identity_id']):
        return jsonify({'code': 400, 'message': '身份证号码格式不正确'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'code': 500, 'message': '数据库连接失败'}), 500

    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM user WHERE username = %s", (data['username'],))
        if cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'code': 409, 'message': '用户名已存在'}), 409

        hashed_password = generate_password_hash(data['password'])
        cursor.execute(
            "INSERT INTO user (username, realname, identity_id, gender, telephone, password, status, last_active) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
            (data['username'], data['realname'], data['identity_id'], 'male' if data['gender'] == '男' else 'female',
             data['telephone'], hashed_password, '离线', datetime.datetime.now())
        )
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({'code': 200, 'message': '注册成功'}), 200
    except mysql.connector.Error as err:
        print(f"数据库错误: {err}")
        if 'cursor' in locals():
            cursor.close()
        if conn:
            conn.close()
        return jsonify({'code': 500, 'message': '数据库错误'}), 500
    except Exception as e:
        print(f"注册错误: {e}")
        if 'cursor' in locals():
            cursor.close()
        if conn:
            conn.close()
        return jsonify({'code': 500, 'message': '服务器错误'}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)