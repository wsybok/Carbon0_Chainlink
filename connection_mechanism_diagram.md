# ERC-20与BatchNFT连接机制图解

## 🔗 1. 双向指针系统

```
BatchNFT (ERC-721)                    ProjectToken (ERC-20)
┌─────────────────────┐              ┌─────────────────────┐
│ TokenID: 1          │◄────────────►│ batchId: 1          │
│ ProjectID: VCS-001  │              │ totalSupply: 100000 │
│ totalCredits: 100000│              │ name: CC-VCS001-2024│
│ issuedCredits: 100k │              │ symbol: CC-FOR-2024 │
│ retiredCredits: 25k │              │ totalRetired: 25000 │
│ tokenAddress: 0x... │              │ batchContract: 0x...│
└─────────────────────┘              └─────────────────────┘
```

## 🏭 2. 创建流程详解

```
Step 1: 项目验证 + BatchNFT铸造
┌──────────────────────────────────────────────────────────┐
│ CarbonCreditBatch.mintBatchWithToken()                   │
│                                                          │
│ 1. 验证项目数据 (Chainlink Functions)                     │
│ 2. 铸造BatchNFT (ID=1)                                   │
│ 3. 调用TokenFactory.createProjectToken()                │
│ 4. 建立双向映射关系                                        │
└──────────────────────────────────────────────────────────┘
                            │
                            ▼
Step 2: ProjectToken自动部署
┌──────────────────────────────────────────────────────────┐
│ TokenFactory.createProjectToken()                       │
│                                                          │
│ 1. new ProjectToken(batchId=1, batchContract=0x...)     │
│ 2. 设置代币名称: "CarbonCredit-VCS001-2024"              │
│ 3. 设置代币符号: "CC-FOR-2024"                           │
│ 4. 建立反向指针: batchId = 1                             │
└──────────────────────────────────────────────────────────┘
                            │
                            ▼
Step 3: 映射关系确认
┌──────────────────────────────────────────────────────────┐
│ 双向验证                                                  │
│                                                          │
│ BatchNFT.batchToTokenContract[1] = ProjectToken合约地址   │
│ ProjectToken.batchId = 1                                │
│ ProjectToken.batchNftContract = BatchNFT合约地址         │
└──────────────────────────────────────────────────────────┘
```

## 🔄 3. 运行时数据同步

```
用户操作: 购买 1000 个 ProjectToken
┌────────────────────────────────────┐
│ ProjectToken.mint(user, 1000)      │
│                                    │
│ 1. _mint(user, 1000)              │
│ 2. totalSupply = 1000             │ 
│ 3. 调用同步函数 ────────────────────┼─┐
└────────────────────────────────────┘ │
                                       │
    ┌──────────────────────────────────┘
    ▼
┌────────────────────────────────────┐
│ BatchNFT.updateIssuedCredits()     │
│                                    │
│ 1. 验证调用者权限                    │
│ 2. batchData[1].issuedCredits += 1000│
│ 3. 触发事件通知                     │
└────────────────────────────────────┘

用户操作: 碳抵消 500 个 ProjectToken
┌────────────────────────────────────┐
│ ProjectToken.retire(500, "reason") │
│                                    │
│ 1. _burn(user, 500)               │
│ 2. totalSupply = 500              │
│ 3. totalRetired = 500             │
│ 4. 调用同步函数 ────────────────────┼─┐
└────────────────────────────────────┘ │
                                       │
    ┌──────────────────────────────────┘
    ▼
┌────────────────────────────────────┐
│ BatchNFT.updateRetiredCredits()    │
│                                    │
│ 1. 验证调用者权限                    │
│ 2. batchData[1].retiredCredits += 500│
│ 3. 生成退休证书                     │
└────────────────────────────────────┘
```

## 🔒 4. 权限控制机制

```
谁可以调用什么函数？

BatchNFT 合约:
├── mintBatchWithToken()     ← 只有授权的发行方
├── updateIssuedCredits()    ← 只有对应的ProjectToken
└── updateRetiredCredits()   ← 只有对应的ProjectToken

ProjectToken 合约:
├── mint()                   ← 只有BatchNFT或授权地址
├── retire()                 ← 任何代币持有者
└── _beforeTokenTransfer()   ← 自动验证BatchNFT连接

TokenFactory 合约:
└── createProjectToken()     ← 只有BatchNFT合约
```

## 🔍 5. 数据验证机制

```
实时验证连接有效性:

function validateConnection() returns (bool) {
    ✅ BatchNFT.ownerOf(batchId) != address(0)     // NFT存在
    ✅ BatchNFT.batchToToken[batchId] == this      // 正向映射正确  
    ✅ this.batchId == expectedBatchId             // 反向映射正确
    ✅ this.batchNftContract != address(0)        // 合约地址有效
    
    return true; // 所有验证通过
}

数据一致性检查:
✅ BatchNFT.issuedCredits == ProjectToken.totalSupply()
✅ BatchNFT.retiredCredits == ProjectToken.totalRetired
✅ 映射关系双向一致
```

## 💡 6. 关键技术要点

### A. 合约部署顺序
```
1. TokenFactory 合约
2. BatchNFT 合约 (引用TokenFactory)
3. ProjectToken 合约 (通过Factory动态创建)
```

### B. 地址存储策略
```
BatchNFT 存储:
├── mapping(uint256 => address) batchToTokenContract
└── 每个BatchMetadata.projectTokenAddress

ProjectToken 存储:
├── uint256 batchId
├── address batchNftContract  
└── address tokenFactory
```

### C. 事件同步
```
BatchNFT 事件:
- BatchMintedWithToken(batchId, tokenAddress, projectId)
- CreditsIssued(batchId, amount)
- CreditsRetired(batchId, amount)

ProjectToken 事件:
- Transfer(from, to, amount) // 标准ERC-20
- CarbonCreditsRetired(user, amount, reason)
```

## 🚨 7. 错误处理和安全

```
常见错误场景和处理:

❌ 尝试创建重复的ProjectToken
   └── require(batchToToken[batchId] == address(0))

❌ 无权限调用同步函数  
   └── modifier onlyProjectToken(batchId)

❌ BatchNFT不存在或无效
   └── validateBatchConnection() 返回 false

❌ 数据不一致
   └── 定期运行验证脚本检查
```

## 🎯 8. 实际使用示例

```solidity
// 完整的使用流程
contract UsageExample {
    function demonstrateWorkflow() external {
        // 1. 项目方申请铸造
        (uint256 batchId, address tokenAddr) = batchNft.mintBatchWithToken(
            projectOwner,
            "VCS-001-2024", 
            100000
        );
        
        // 2. 发行方铸造代币给用户
        IProjectToken(tokenAddr).mint(user, 1000);
        
        // 3. 用户交易代币 (标准ERC-20)
        IERC20(tokenAddr).transfer(buyer, 500);
        
        // 4. 用户进行碳抵消
        IProjectToken(tokenAddr).retire(100, "Personal carbon offset");
        
        // 5. 验证数据同步
        (bool isValid,) = IProjectToken(tokenAddr).validateBatchConnection();
        require(isValid, "Data sync failed");
    }
}
```

这个技术架构确保了ERC-20和BatchNFT之间的紧密连接，同时保持了数据一致性和系统安全性！