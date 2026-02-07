"""
Emby Request 授权验证模块
"""

# 加载编译后的核心模块
try:
    from license_core import (
        require_license,
        check_license,
        is_license_valid,
        get_machine_id
    )
except ImportError:
    import sys
    print("=" * 55)
    print("  错误: 授权模块未正确安装")
    print("=" * 55)
    print("请联系管理员获取正确的程序包")
    print("=" * 55)
    sys.exit(1)

# 支持命令行查看机器码
if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "machine-id":
        print("=" * 55)
        print("  机器码信息")
        print("=" * 55)
        print(f"  Machine ID: {get_machine_id()}")
        print("=" * 55)
    else:
        print("用法: python license.py machine-id")

