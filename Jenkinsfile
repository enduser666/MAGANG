pipeline {
    agent any

    environment {
        // Mendefinisikan environment variables jika diperlukan
        COMPOSE_FILE = 'docker-compose.prod.yml'
        DOCKER_HOST = 'tcp://localhost:2375'
        DOCKER_COMPOSE = 'C:\\Users\\HP\\AppData\\Local\\Programs\\DockerDesktop\\resources\\bin\\docker-compose.exe'
    }

    stages {
        stage('Checkout') {
            steps {
                // Menarik kode terbaru dari repository Git
                checkout scm
            }
        }

        stage('Setup Environment') {
            steps {
                script {
                    // Pastikan file .env tersedia. Di Jenkins, lebih aman menggunakan 'Credentials Binding'
                    // Untuk contoh ini, kita asumsikan file .env sudah di-inject atau di-copy dari secret Jenkins
                    echo "Checking .env file..."
                    bat 'copy .env.docker.example .env' // Ganti dengan logika injeksi secret yang sebenarnya nanti
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                // Mem-build image menggunakan docker-compose
                echo "Building application images..."
                bat "\"%DOCKER_COMPOSE%\" -f ${COMPOSE_FILE} build"
            }
        }

        stage('Deploy (Up)') {
            steps {
                // Menjalankan container di background (-d)
                echo "Deploying application..."
                bat "\"%DOCKER_COMPOSE%\" -f ${COMPOSE_FILE} up -d"
            }
        }

        stage('Cleanup') {
            steps {
                // Membersihkan image lama yang tidak terpakai agar server tidak penuh
                echo "Cleaning up dangling images..."
                bat "\"C:\\Users\\HP\\AppData\\Local\\Programs\\DockerDesktop\\resources\\bin\\docker.exe\" image prune -f"
            }
        }
    }

    post {
        success {
            echo "Deployment berhasil dijalankan!"
        }
        failure {
            echo "Deployment gagal. Harap periksa log Jenkins."
        }
    }
}
