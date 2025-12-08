// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.28;

// Минимальный интерфейс и реализация фабрики/пары Uniswap V2.

interface IERC20Minimal {
    function balanceOf(address account) external view returns (uint256);
}

interface IUniswapV2Pair {
    function initialize(address token0, address token1) external;
    function mint(address to) external returns (uint256 liquidity);
}

contract UniswapV2PairMinimal is IUniswapV2Pair {
    address public token0;
    address public token1;

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;

    uint112 private reserve0;
    uint112 private reserve1;
    uint256 private unlocked = 1;

    uint256 public constant MINIMUM_LIQUIDITY = 10**3;

    modifier lock() {
        require(unlocked == 1, "LOCKED");
        unlocked = 0;
        _;
        unlocked = 1;
    }

    function initialize(address _token0, address _token1) external override {
        require(token0 == address(0) && token1 == address(0), "ALREADY_INIT");
        token0 = _token0;
        token1 = _token1;
    }

    function getReserves() external view returns (uint112, uint112) {
        return (reserve0, reserve1);
    }

    function mint(address to) external override lock returns (uint256 liquidity) {
        (uint112 _reserve0, uint112 _reserve1) = (reserve0, reserve1);
        uint256 balance0 = IERC20Minimal(token0).balanceOf(address(this));
        uint256 balance1 = IERC20Minimal(token1).balanceOf(address(this));
        uint256 amount0 = balance0 - _reserve0;
        uint256 amount1 = balance1 - _reserve1;

        if (totalSupply == 0) {
            // First liquidity provider: burn MINIMUM_LIQUIDITY to address(0)
            // This prevents division-by-zero attacks and ensures minimum pool depth
            liquidity = _sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY;
            balanceOf[address(0)] = MINIMUM_LIQUIDITY;
            balanceOf[to] = liquidity;
            totalSupply = liquidity + MINIMUM_LIQUIDITY;
        } else {
            // Subsequent liquidity: proportional to existing reserves
            liquidity = _min((amount0 * totalSupply) / _reserve0, (amount1 * totalSupply) / _reserve1);
            balanceOf[to] += liquidity;
            totalSupply += liquidity;
        }
        require(liquidity > 0, "INSUFFICIENT_LIQUIDITY_MINTED");

        _update(balance0, balance1);
    }

    function transfer(address to, uint256 value) external returns (bool) {
        require(balanceOf[msg.sender] >= value, "INSUFFICIENT_LIQUIDITY");
        balanceOf[msg.sender] -= value;
        balanceOf[to] += value;
        return true;
    }

    function _update(uint256 balance0, uint256 balance1) private {
        require(balance0 <= type(uint112).max && balance1 <= type(uint112).max, "OVERFLOW");
        reserve0 = uint112(balance0);
        reserve1 = uint112(balance1);
    }

    function _sqrt(uint256 y) private pure returns (uint256 z) {
        if (y == 0) {
            return 0;
        }
        uint256 x = y / 2 + 1;
        z = y;
        while (x < z) {
            z = x;
            x = (y / x + x) / 2;
        }
    }

    function _min(uint256 x, uint256 y) private pure returns (uint256) {
        return x < y ? x : y;
    }
}

contract UniswapV2Factory {
    address public feeTo;
    address public feeToSetter;

    mapping(address => mapping(address => address)) public getPair;
    address[] public allPairs;

    event PairCreated(address indexed token0, address indexed token1, address pair, uint256);

    constructor(address _feeToSetter) {
        feeToSetter = _feeToSetter;
    }

    function allPairsLength() external view returns (uint256) {
        return allPairs.length;
    }

    function createPair(address tokenA, address tokenB) external returns (address pair) {
        require(tokenA != tokenB, "IDENTICAL_ADDRESSES");
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), "ZERO_ADDRESS");
        require(getPair[token0][token1] == address(0), "PAIR_EXISTS");

        UniswapV2PairMinimal newPair = new UniswapV2PairMinimal();
        newPair.initialize(token0, token1);
        pair = address(newPair);

        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair;
        allPairs.push(pair);

        emit PairCreated(token0, token1, pair, allPairs.length);
    }

    function setFeeTo(address _feeTo) external {
        require(msg.sender == feeToSetter, "FORBIDDEN");
        feeTo = _feeTo;
    }

    function setFeeToSetter(address _feeToSetter) external {
        require(msg.sender == feeToSetter, "FORBIDDEN");
        feeToSetter = _feeToSetter;
    }
}
