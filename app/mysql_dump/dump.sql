/*
SQLyog Ultimate v12.14 (64 bit)
MySQL - 10.4.28-MariaDB : Database - task_management
*********************************************************************
*/


/*!40101 SET NAMES utf8 */;

/*!40101 SET SQL_MODE=''*/;

/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
CREATE DATABASE /*!32312 IF NOT EXISTS*/`task_management` /*!40100 DEFAULT CHARACTER SET utf8 COLLATE utf8_general_ci */;

USE `task_management`;

/*Table structure for table `status` */

DROP TABLE IF EXISTS `status`;

CREATE TABLE `status` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `name_lat` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

/*Data for the table `status` */

insert  into `status`(`id`,`name`,`name_lat`) values 
(1,'В черзі','active'),
(2,'В роботі','in-progress'),
(3,'На перевірці','under-review'),
(4,'Архів','archive'),
(5,'Відхилено','rejected'),
(6,'Призупинено','suspended'),
(7,'На перевірці у клієнта','review-client');

/*Table structure for table `tasks` */

DROP TABLE IF EXISTS `tasks`;

CREATE TABLE `tasks` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `project` varchar(255) DEFAULT NULL,
  `responsible_pm` int(11) NOT NULL,
  `assigned_to` int(11) NOT NULL,
  `description` text DEFAULT NULL,
  `status` int(11) NOT NULL DEFAULT 1,
  `deleted` tinyint(1) NOT NULL DEFAULT 0,
  `date_creating` timestamp NOT NULL DEFAULT current_timestamp(),
  `date_editing` timestamp NOT NULL DEFAULT current_timestamp(),
  `priority` int(3) NOT NULL DEFAULT 4,
  `source` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `name` (`name`),
  KEY `project` (`project`),
  KEY `responsible_pm` (`responsible_pm`),
  KEY `assigned_to` (`assigned_to`),
  KEY `status` (`status`),
  KEY `deleted` (`deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

/*Data for the table `tasks` */

/*Table structure for table `tasks_history` */

DROP TABLE IF EXISTS `tasks_history`;

CREATE TABLE `tasks_history` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `task_id` bigint(20) NOT NULL,
  `name` varchar(255) NOT NULL,
  `project` varchar(255) DEFAULT NULL,
  `responsible_pm` int(11) NOT NULL,
  `assigned_to` int(11) NOT NULL,
  `description` text DEFAULT NULL,
  `status` int(11) NOT NULL DEFAULT 1,
  `deleted` tinyint(1) NOT NULL DEFAULT 0,
  `date_creating` timestamp NOT NULL DEFAULT current_timestamp(),
  `date_editing` timestamp NOT NULL DEFAULT current_timestamp(),
  `priority` int(3) NOT NULL DEFAULT 1,
  `source` text DEFAULT NULL,
  `datetime` timestamp NULL DEFAULT current_timestamp(),
  `action` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `name` (`name`),
  KEY `project` (`project`),
  KEY `responsible_pm` (`responsible_pm`),
  KEY `assigned_to` (`assigned_to`),
  KEY `status` (`status`),
  KEY `deleted` (`deleted`),
  KEY `task_id` (`task_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

/*Data for the table `tasks_history` */

/*Table structure for table `users` */

DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `login` varchar(255) DEFAULT NULL COMMENT 'Логин',
  `pass` varchar(255) DEFAULT NULL COMMENT 'Пароль',
  `role` int(5) DEFAULT 1 COMMENT 'Роль',
  `name` varchar(255) NOT NULL COMMENT 'Название',
  `surname` varchar(255) DEFAULT NULL,
  `patronymic` varchar(255) DEFAULT NULL,
  `date_creating` timestamp NULL DEFAULT current_timestamp(),
  `date_editing` datetime DEFAULT current_timestamp(),
  `deleted` tinyint(1) DEFAULT 0,
  `theme` tinyint(1) DEFAULT 1,
  `phone` varchar(50) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `position` enum('developer','project manager','supervisor','system administrator','tester') DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `login` (`login`),
  KEY `deleted` (`deleted`),
  KEY `position` (`position`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

/*Data for the table `users` */

/* Trigger structure for table `tasks` */

DELIMITER $$

/*!50003 DROP TRIGGER*//*!50032 IF EXISTS */ /*!50003 `after_task_add` */$$

/*!50003 CREATE */  /*!50003 TRIGGER `after_task_add` AFTER INSERT ON `tasks` FOR EACH ROW BEGIN

	INSERT INTO `tasks_history` (`task_id`,`name`,`project`,`responsible_pm`,`assigned_to`,`description`,`status`,`deleted`,`date_creating`,`date_editing`,`priority`,`source`, `action`) 

	VALUES (NEW.id, NEW.name, NEW.project, NEW.responsible_pm, NEW.assigned_to, NEW.description, NEW.status, NEW.deleted, NEW.date_creating, NEW.date_editing, NEW.priority, NEW.source, 'insert');

END */$$


DELIMITER ;

/* Trigger structure for table `tasks` */

DELIMITER $$

/*!50003 DROP TRIGGER*//*!50032 IF EXISTS */ /*!50003 `after_task_update` */$$

/*!50003 CREATE */  /*!50003 TRIGGER `after_task_update` AFTER UPDATE ON `tasks` FOR EACH ROW 
BEGIN

	INSERT INTO `tasks_history` (`task_id`,`name`,`project`,`responsible_pm`,`assigned_to`,`description`,`status`,`deleted`,`date_creating`,`date_editing`,`priority`,`source`, `action`) 

	VALUES (NEW.id, NEW.name, NEW.project, NEW.responsible_pm, NEW.assigned_to, NEW.description, NEW.status, NEW.deleted, NEW.date_creating, NEW.date_editing, NEW.priority, NEW.source, 'update');

END */$$


DELIMITER ;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
