tar -xvf glibc-2.18.tar.gz 
cd glibc-2.18
mkdir build && cd build && ../configure --prefix=/usr && make -j4 && make install
