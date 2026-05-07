-- DROP TABLE IF EXISTS `im_chat`;
CREATE TABLE IF NOT EXISTS `im_chat` (
  `id` mediumint(8) unsigned NOT NULL AUTO_INCREMENT,
  `gid` char(40) NOT NULL DEFAULT '',
  `name` varchar(60) NOT NULL DEFAULT '',
  `type` varchar(20) NOT NULL DEFAULT 'group',
  `admins` varchar(255) NOT NULL DEFAULT '',
  `committers` varchar(255) NOT NULL DEFAULT '',
  `subject` mediumint(8) unsigned NOT NULL DEFAULT 0,
  `public` enum('0', '1') NOT NULL DEFAULT '0',
  `createdBy` varchar(30) NOT NULL DEFAULT '',
  `createdDate` datetime NOT NULL,
  `ownedBy` varchar(30) NOT NULL DEFAULT '',
  `editedBy` varchar(30) NOT NULL DEFAULT '',
  `editedDate` datetime NULL,
  `mergedDate` datetime NULL,
  `lastActiveTime` datetime NULL,
  `lastMessage` int(11) unsigned NOT NULL DEFAULT 0,
  `lastMessageIndex` int(11) unsigned NOT NULL DEFAULT 0,
  `dismissDate` datetime NULL,
  `pinnedMessages` text NULL,
  `mergedChats` text NULL,
  `adminInvite` enum('0','1') NOT NULL DEFAULT '0',
  `avatar` text NULL,
  `archiveDate` datetime NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE INDEX `idx_gid` ON `im_chat` (`gid`);
CREATE INDEX `idx_name` ON `im_chat` (`name`);
CREATE INDEX `idx_type` ON `im_chat` (`type`);
CREATE INDEX `idx_public` ON `im_chat` (`public`);
CREATE INDEX `idx_createdBy` ON `im_chat` (`createdBy`);
CREATE INDEX `idx_editedBy` ON `im_chat` (`editedBy`);

-- DROP TABLE IF EXISTS `im_chatuser`;
CREATE TABLE IF NOT EXISTS `im_chatuser` (
  `id` mediumint(8) unsigned NOT NULL AUTO_INCREMENT,
  `cgid` char(40) NOT NULL DEFAULT '',
  `user` mediumint(8) NOT NULL DEFAULT 0,
  `order` smallint(5) NOT NULL DEFAULT 0,
  `star` enum('0', '1') NOT NULL DEFAULT '0',
  `hide` enum('0', '1') NOT NULL DEFAULT '0',
  `mute` enum('0', '1') NOT NULL DEFAULT '0',
  `freeze` enum('0', '1') NOT NULL DEFAULT '0',
  `join` datetime NOT NULL,
  `quit` datetime NULL,
  `category` varchar(40) NOT NULL DEFAULT '',
  `lastReadMessage` int(11) unsigned NOT NULL DEFAULT 0,
  `lastReadMessageIndex` int(11) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE INDEX `idx_cgid` ON `im_chatuser` (`cgid`);
CREATE INDEX `idx_user` ON `im_chatuser` (`user`);
CREATE INDEX `idx_order` ON `im_chatuser` (`order`);
CREATE INDEX `idx_star` ON `im_chatuser` (`star`);
CREATE INDEX `idx_hide` ON `im_chatuser` (`hide`);
CREATE UNIQUE INDEX `uk_chatuser` ON `im_chatuser` (`cgid`, `user`);

-- DROP TABLE IF EXISTS `im_client`;
CREATE TABLE IF NOT EXISTS `im_client` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `version` char(30) NOT NULL DEFAULT '',
  `desc` varchar(100) NOT NULL DEFAULT '',
  `changeLog` text NOT NULL,
  `strategy` varchar(10) NOT NULL DEFAULT '',
  `downloads` text NOT NULL,
  `createdDate` datetime NULL,
  `createdBy` varchar(30) NOT NULL DEFAULT '',
  `editedDate` datetime NULL,
  `editedBy` varchar(30) NOT NULL DEFAULT '',
  `status` enum('released','wait') NOT NULL DEFAULT 'wait',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- DROP TABLE IF EXISTS `im_message`;
CREATE TABLE IF NOT EXISTS `im_message` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `gid` char(40) NOT NULL DEFAULT '',
  `cgid` char(40) NOT NULL DEFAULT '',
  `user` varchar(30) NOT NULL DEFAULT '',
  `date` datetime NOT NULL,
  `index` int(11) unsigned NOT NULL DEFAULT 0,
  `type` enum('normal', 'broadcast', 'notify', 'bulletin', 'botcommand') NOT NULL DEFAULT 'normal',
  `content` text NULL,
  `contentType` enum('text', 'plain', 'emotion', 'image', 'file', 'object', 'code', 'merge', 'voice') NOT NULL DEFAULT 'text',
  `data` text NULL,
  `read` text NULL,
  `deleted` enum('0','1') NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE INDEX `idx_mgid` ON `im_message` (`gid`);
CREATE INDEX `idx_mcgid` ON `im_message` (`cgid`);
CREATE INDEX `idx_muser` ON `im_message` (`user`);
CREATE INDEX `idx_mtype` ON `im_message` (`type`);
CREATE UNIQUE INDEX `uk_uniqueIndexInChat` ON `im_message` (`cgid`, `index`);

-- DROP TABLE IF EXISTS `im_message_backup`;
CREATE TABLE IF NOT EXISTS `im_message_backup` (
  `id` int(11) unsigned NOT NULL,
  `gid` char(40) NOT NULL DEFAULT '',
  `cgid` char(40) NOT NULL DEFAULT '',
  `user` varchar(30) NOT NULL DEFAULT '',
  `date` datetime NOT NULL,
  `index` int(11) unsigned NOT NULL DEFAULT 0,
  `type` enum('normal', 'broadcast', 'notify', 'bulletin', 'botcommand') NOT NULL DEFAULT 'normal',
  `content` text NULL,
  `contentType` enum('text', 'plain', 'emotion', 'image', 'file', 'object', 'code', 'merge', 'voice') NOT NULL DEFAULT 'text',
  `data` text NULL,
  `read` text NULL,
  `deleted` enum('0','1') NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- DROP TABLE IF EXISTS `im_message_index`;
CREATE TABLE IF NOT EXISTS `im_message_index` (
  `id` mediumint(8) unsigned NOT NULL AUTO_INCREMENT,
  `tableName` char(64) NOT NULL,
  `start` int(11) unsigned NOT NULL,
  `end` int(11) unsigned NOT NULL,
  `startDate` datetime NOT NULL,
  `endDate` datetime NOT NULL,
  `chats` text NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE INDEX `idx_tableName` ON `im_message_index` (`tableName`);
CREATE INDEX `idx_start` ON `im_message_index` (`start`);
CREATE INDEX `idx_end` ON `im_message_index` (`end`);
CREATE INDEX `idx_startDate` ON `im_message_index` (`startDate`);
CREATE INDEX `idx_endDate` ON `im_message_index` (`endDate`);

-- DROP TABLE IF EXISTS `im_chat_message_index`;
CREATE TABLE IF NOT EXISTS `im_chat_message_index` (
  `id` mediumint(8) unsigned NOT NULL AUTO_INCREMENT,
  `gid` char(40) NOT NULL,
  `tableName` char(64) NOT NULL,
  `start` int(11) unsigned NOT NULL,
  `end` int(11) unsigned NOT NULL,
  `startIndex` int(11) unsigned NOT NULL,
  `endIndex` int(11) unsigned NOT NULL,
  `startDate` datetime NOT NULL,
  `endDate` datetime NOT NULL,
  `count` mediumint(8) unsigned NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE UNIQUE INDEX `uk_chattable` ON `im_chat_message_index` (`gid`, `tableName`);
CREATE INDEX `idx_start` ON `im_chat_message_index` (`start`);
CREATE INDEX `idx_end` ON `im_chat_message_index` (`end`);
CREATE INDEX `idx_startDate` ON `im_chat_message_index` (`startDate`);
CREATE INDEX `idx_endDate` ON `im_chat_message_index` (`endDate`);
CREATE INDEX `idx_chatstartindex` ON `im_chat_message_index` (`gid`, `startIndex`);
CREATE INDEX `idx_chatendindex` ON `im_chat_message_index` (`gid`, `endIndex`);

-- DROP TABLE IF EXISTS `im_messagestatus`;
CREATE TABLE IF NOT EXISTS `im_messagestatus` (
  `user` mediumint(8) NOT NULL DEFAULT 0,
  `message` int(11) unsigned NOT NULL,
  `status` enum('waiting','sent','readed','deleted') NOT NULL DEFAULT 'waiting'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE UNIQUE INDEX `uk_user` ON `im_messagestatus` (`user`, `message`);

-- DROP TABLE IF EXISTS `im_queue`;
CREATE TABLE IF NOT EXISTS `im_queue` (
  `id` mediumint(8) unsigned NOT NULL auto_increment,
  `type` char(30) NOT NULL,
  `content` text NOT NULL,
  `addDate` datetime NULL,
  `processDate` datetime NULL,
  `result` text NOT NULL,
  `status` char(30) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- DROP TABLE IF EXISTS `im_userdevice`;
CREATE TABLE IF NOT EXISTS `im_userdevice` (
  `id` mediumint(8) unsigned NOT NULL auto_increment,
  `user` mediumint(8) NOT NULL DEFAULT 0,
  `device` char(40) NOT NULL DEFAULT 'default',
  `deviceID` char(40) NOT NULL DEFAULT '',
  `token` char(64) NOT NULL DEFAULT '',
  `validUntil` datetime NOT NULL,
  `lastLogin` datetime NULL,
  `lastLogout` datetime NULL,
  `online` tinyint(1) NOT NULL DEFAULT 0,
  `version` char(10) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE INDEX `idx_user` ON `im_userdevice` (`user`);
CREATE INDEX `idx_lastLogin` ON `im_userdevice` (`lastLogin`);
CREATE INDEX `idx_lastLogout` ON `im_userdevice` (`lastLogout`);
CREATE UNIQUE INDEX `uk_userdevice` ON `im_userdevice` (`user`, `device`);

ALTER TABLE `xxb_file` CHANGE `pathname` `pathname` char(100) NOT NULL;
ALTER TABLE `xxb_file` CHANGE `size` `size` int(10) unsigned NOT NULL DEFAULT '0';
ALTER TABLE `xxb_user` ADD `clientStatus` enum('online', 'away', 'busy', 'offline', 'meeting') NOT NULL DEFAULT 'offline';
ALTER TABLE `xxb_user` ADD `clientLang` varchar(10) NOT NULL DEFAULT 'zh-cn';
