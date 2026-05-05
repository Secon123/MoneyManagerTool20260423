-- 用户表
CREATE TABLE `user` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `register_time` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`),
  UNIQUE KEY `uk_email` (`email`)
);

-- 交易记录表
CREATE TABLE `transaction` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `type` varchar(10) NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `category` varchar(255) NOT NULL,
  `date` date NOT NULL,
  `remark` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_transaction_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
);

-- 索引
CREATE INDEX idx_user_date ON `transaction` (`user_id`, `date`);
CREATE INDEX idx_user_type ON `transaction` (`user_id`, `type`);
