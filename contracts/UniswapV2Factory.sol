// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.28;

// Минимальный интерфейс и реализация фабрики Uniswap V2,
// адаптированный под Solidity 0.8+ для учебного проекта.

interface IUniswapV2Pair {
    function initialize(address token0, address token1) external;
}

contract UniswapV2PairMinimal is IUniswapV2Pair {
    address public token0;
    address public token1;

    function initialize(address _token0, address _token1) external override {
        require(token0 == address(0) && token1 == address(0), "ALREADY_INIT");
        token0 = _token0;
        token1 = _token1;
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
